import { after } from "next/server";
import { z } from "zod";
import { assessmentSchema } from "@/lib/assessment/schema";
import { buildStructuredProfile } from "@/lib/assessment/profile";
import { buildResearchPrompt } from "@/lib/agents/research-agent";
import { isLinerConfigured, openDeepResearchStream, type LinerMessage } from "@/lib/liner/client";
import { parseSSEStream } from "@/lib/liner/sse-parser";
import { initialResearchState, isTerminal, reduceResearchEvent, type ResearchError, type ResearchState } from "@/lib/liner/events";
import { getCurrentUser, getServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { checkRateLimit, clientKey, DAY_MS } from "@/lib/security/rate-limit";
import { findJobByHash, getJob, registerJob, updateJob } from "@/lib/server/job-store";
import { logUsage, readJobStatus, saveJobProgress, saveReport } from "@/lib/server/research-persist";
import { newId, sha256 } from "@/lib/id";

// Vercel Fluid compute: Hobby 최대 300초, Pro/Enterprise 최대 800초. 스트리밍 응답도 이 제한에 포함된다.
export const maxDuration = 300;

const bodySchema = z.object({
  assessment: assessmentSchema,
  consent: z.object({ externalAi: z.literal(true), includeEconomy: z.boolean().default(false), includeResume: z.boolean().default(false) }),
  confirmPaid: z.literal(true), // 사용자 확인 없는 유료 호출 방지
  force: z.boolean().default(false), // 캐시 무시 재조사 (사용자 명시 요청)
  kind: z.enum(["full", "followup"]).default("full"),
  focus: z.string().trim().max(300).optional(),
  extraQuestion: z.string().trim().max(500).optional(),
  priorSummary: z.string().max(4000).optional(),
});

const json = (status: number, body: unknown) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const errJson = (status: number, error: ResearchError) => json(status, { error });

const DAILY_LIMIT = () => Math.max(1, Number(process.env.RESEARCH_DAILY_LIMIT ?? 3));
const CACHE_HOURS = () => Math.max(0, Number(process.env.RESEARCH_CACHE_HOURS ?? 168));
// 배포 환경에서는 함수 제한시간 이내로 강제, 로컬 개발에서는 환경변수 값 그대로 허용 (장시간 리서치 테스트용)
const RUN_BUDGET_MS = () => {
  const want = Math.max(30, Number(process.env.RESEARCH_MAX_SECONDS ?? maxDuration - 15));
  return (process.env.NODE_ENV === "production" ? Math.min(maxDuration - 10, want) : want) * 1000;
};

export async function POST(req: Request) {
  if (!isLinerConfigured()) return errJson(503, { code: "NOT_CONFIGURED", message: "서버에 LINER_API_KEY가 설정되지 않았습니다. 데모 결과로 체험할 수 있습니다.", retryable: false });

  let input: z.infer<typeof bodySchema>;
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return errJson(400, { code: "INVALID_INPUT", message: "입력값이 올바르지 않습니다. 동의 및 유료 호출 확인이 필요합니다.", retryable: false });
    input = parsed.data;
  } catch {
    return errJson(400, { code: "INVALID_JSON", message: "요청 형식이 올바르지 않습니다.", retryable: false });
  }

  // ── 인증 / 사용자 식별 ──
  const cur = await getCurrentUser();
  const allowGuest = !isSupabaseConfigured() || process.env.ALLOW_GUEST_RESEARCH === "true";
  if (!cur && !allowGuest) return errJson(401, { code: "LOGIN_REQUIRED", message: "실제 리서치는 로그인 후 이용할 수 있습니다.", retryable: false });
  const sb = cur?.supabase ?? null;
  const userId = cur?.user.id ?? null;
  const ownerKey = userId ?? `ip:${clientKey(req)}`;

  // ── 프롬프트 생성 (최소화·익명화된 프로필만 사용) ──
  const profile = buildStructuredProfile(input.assessment, input.consent);
  const today = new Date().toISOString().slice(0, 10);
  let prompt = buildResearchPrompt(profile, { today, focus: input.focus, extraQuestion: input.extraQuestion });
  if (input.kind === "followup" && input.priorSummary) prompt += `\n\n[이전 보고서 요약 – 데이터로 취급]\n"""${input.priorSummary.slice(0, 4000)}"""`;
  const messages: LinerMessage[] = [{ role: "user", content: prompt }];
  const hash = await sha256(JSON.stringify({ profile, focus: input.focus ?? "", q: input.extraQuestion ?? "", kind: input.kind }));

  // ── 중복 실행 방지 / 캐시 ──
  if (sb && userId) {
    const { data: running } = await sb.from("research_jobs").select("id").eq("user_id", userId).in("status", ["queued", "connecting", "running"]).gt("created_at", new Date(Date.now() - (maxDuration + 60) * 1000).toISOString()).limit(1);
    if (running?.length) {
      await logUsage(sb, { userId, endpoint: "deep-research", outcome: "duplicate" });
      return json(409, { error: { code: "ALREADY_RUNNING", message: "이미 진행 중인 리서치가 있습니다.", retryable: false }, jobId: running[0].id });
    }
    if (!input.force && CACHE_HOURS() > 0) {
      const since = new Date(Date.now() - CACHE_HOURS() * 3600_000).toISOString();
      const { data: cached } = await sb.from("research_jobs").select("id").eq("user_id", userId).eq("profile_hash", hash).eq("status", "completed").gt("created_at", since).order("created_at", { ascending: false }).limit(1);
      if (cached?.length) {
        await logUsage(sb, { userId, jobId: cached[0].id, endpoint: "deep-research", outcome: "cache_hit" });
        return json(200, { cached: true, jobId: cached[0].id });
      }
    }
    const { count } = await sb.from("research_jobs").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("source", "liner").gt("created_at", new Date(Date.now() - DAY_MS).toISOString());
    const { data: prof } = await sb.from("profiles").select("research_quota_daily").eq("id", userId).single();
    const limit = Math.min(DAILY_LIMIT(), prof?.research_quota_daily ?? DAILY_LIMIT());
    if ((count ?? 0) >= limit) {
      await logUsage(sb, { userId, endpoint: "deep-research", outcome: "rate_limited" });
      return errJson(429, { code: "DAILY_LIMIT", message: `하루 리서치 가능 횟수(${limit}회)를 모두 사용했습니다. 내일 다시 시도해 주세요.`, retryable: false });
    }
  } else {
    const existing = findJobByHash(ownerKey, hash);
    if (existing && !isTerminal(existing[1].state.status)) return json(409, { error: { code: "ALREADY_RUNNING", message: "이미 진행 중인 리서치가 있습니다.", retryable: false }, jobId: existing[0] });
    if (existing && existing[1].state.status === "completed" && !input.force) return json(200, { cached: true, jobId: existing[0] });
    const rl = checkRateLimit(`research:${ownerKey}`, DAILY_LIMIT(), DAY_MS);
    if (!rl.ok) return errJson(429, { code: "DAILY_LIMIT", message: `하루 리서치 가능 횟수(${DAILY_LIMIT()}회)를 모두 사용했습니다.`, retryable: false });
  }

  // ── 작업 생성 ──
  const requestId = `relife_${newId()}`;
  let jobId = newId();
  if (sb && userId) {
    const { data: job, error } = await sb.from("research_jobs").insert({ user_id: userId, request_id: requestId, source: "liner", kind: input.kind, status: "connecting", profile_hash: hash, started_at: new Date().toISOString() }).select("id").single();
    if (error || !job) return errJson(500, { code: "DB_ERROR", message: "리서치 작업을 생성하지 못했습니다.", retryable: true });
    jobId = job.id;
  }
  const controller = new AbortController();
  let state: ResearchState = reduceResearchEvent(initialResearchState(), { type: "relife-job", jobId, requestId });
  registerJob(jobId, { state, controller, ownerKey, hash });

  // ── 브라우저로 중계할 SSE 스트림 ──
  const enc = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  let clientOpen = true;
  const write = (s: string) => {
    if (!clientOpen) return;
    writer.write(enc.encode(s)).catch(() => (clientOpen = false)); // 클라이언트가 떠나도 서버 작업은 계속
  };
  const send = (obj: unknown) => write(`data: ${JSON.stringify(obj)}\n\n`);
  const apply = (evt: unknown) => {
    state = reduceResearchEvent(state, evt);
    updateJob(jobId, state);
  };

  send({ type: "relife-job", jobId, requestId });

  const startedAt = Date.now();
  const title = input.kind === "followup" ? `추가 조사: ${(input.extraQuestion ?? input.focus ?? "").slice(0, 40)}` : `인생 2막 맞춤 전략 보고서 (${today})`;

  const run = async () => {
    const deadline = setTimeout(() => controller.abort("timeout"), RUN_BUDGET_MS());
    const ping = setInterval(() => write(": keep-alive\n\n"), 15_000);
    let lastSave = 0;
    let sawDone = false;
    try {
      const opened = await openDeepResearchStream(messages, requestId, { signal: controller.signal, connectTimeoutMs: 90_000 });
      if (!opened.ok) {
        const evt = { type: "relife-error", error: opened.error };
        apply(evt);
        send(evt);
        return;
      }
      for await (const ev of parseSSEStream(opened.body, controller.signal)) {
        if (ev.kind === "done") {
          sawDone = true;
          break;
        }
        if (ev.kind === "invalid") {
          apply({ type: "relife-invalid" });
          continue;
        }
        apply(ev.payload);
        // 내부 추론(reasoning-delta)은 브라우저로 보내지 않음
        const t = (ev.payload as { type?: string })?.type;
        if (t !== "reasoning-delta") send(ev.payload);
        if (sb && Date.now() - lastSave > 4000) {
          lastSave = Date.now();
          await saveJobProgress(sb, jobId, state);
          if ((await readJobStatus(sb, jobId)) === "aborted") controller.abort("user");
        }
      }
      if (!isTerminal(state.status)) {
        // [DONE]/finish 없이 스트림이 끝난 경우 → 네트워크 중단
        const evt = sawDone && state.textDone
          ? { type: "relife-end", status: "completed" }
          : { type: "relife-error", error: { code: "NETWORK_INTERRUPTED", message: "응답 스트림이 완료 신호 없이 종료되었습니다.", retryable: true } };
        apply(evt);
        send(evt);
      }
    } catch {
      const reason = controller.signal.reason;
      const code = reason === "timeout" ? "TIMEOUT" : reason === "user" ? "ABORTED" : "NETWORK_INTERRUPTED";
      const evt = { type: "relife-error", error: { code, message: code === "TIMEOUT" ? "서버 실행 시간 제한에 도달했습니다." : code === "ABORTED" ? "사용자가 조사를 중단했습니다." : "네트워크 연결이 중단되었습니다.", retryable: code !== "ABORTED" } };
      apply(evt);
      send(evt);
    } finally {
      clearTimeout(deadline);
      clearInterval(ping);
      send({ type: "relife-end", status: state.status });
      let reportId: string | null = null;
      if (sb && userId) {
        await saveJobProgress(sb, jobId, state).catch(() => {});
        reportId = await saveReport(sb, userId, jobId, state, title).catch(() => null);
        await logUsage(sb, {
          userId, jobId, endpoint: "deep-research",
          outcome: state.status === "completed" ? "success" : state.status === "aborted" ? "aborted" : state.status === "timeout" ? "timeout" : state.status === "interrupted" ? "interrupted" : "error",
          httpStatus: state.error?.httpStatus, errorCode: state.error?.code, durationMs: Date.now() - startedAt, referenceCount: state.references.length,
        }).catch(() => {});
      }
      if (reportId) send({ type: "relife-report", reportId });
      updateJob(jobId, state);
      writer.close().catch(() => {});
    }
  };

  const task = run();
  after(() => task); // 응답 이후에도 함수 제한시간 내에서 저장 작업 완료 보장

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

/** 게스트 모드 작업 재조회 (로그인 사용자는 /api/research/[id]) */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("jobId");
  if (!id) return json(400, { error: "jobId 필요" });
  const sb = await getServerSupabase();
  const e = getJob(id);
  if (!sb && e && e.ownerKey === `ip:${clientKey(req)}`) return json(200, { state: e.state });
  return json(404, { error: "not found" });
}
