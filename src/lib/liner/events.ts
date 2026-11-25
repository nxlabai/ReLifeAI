import { z } from "zod";
import { isSafeExternalUrl, hostnameOf } from "@/lib/security/url";

/**
 * Liner Deep Research SSE 이벤트 처리 (공식 문서 기준).
 * 순서: start → start-step → data-search-tasks → (data-search-step → data-search-references → data-search-chunks)*
 *       → reasoning-* → text-start → text-delta* → text-end → [data-metadata] → finish-step → finish → [DONE]
 * 문서에 세부 형태가 정의되지 않은 이벤트(data-search-step, references/chunks 요소)는 방어적으로 해석한다.
 */

export type ResearchStatus =
  | "idle" | "connecting" | "running" | "completed" | "failed" | "aborted" | "timeout" | "interrupted";

export type SearchTask = { taskId: string; task: string; isComplete: boolean; status?: string };
export type SearchStep = { key: string; label: string };
export type Reference = { index: number; title: string; url: string; hostname: string; date?: string; snippet?: string };
export type ResearchError = { code: string; message: string; retryable: boolean; httpStatus?: number };

export type ResearchState = {
  status: ResearchStatus;
  jobId?: string;
  messageId?: string;
  requestId?: string;
  traceId?: string;
  tasks: SearchTask[];
  steps: SearchStep[];
  stepEventCount: number;
  references: Reference[];
  /** 수신한 참조 원본 개수 (Liner 인용 번호 ((n)) 은 수신 순서 n 번째 참조를 가리킴 – 실제 응답으로 확인) */
  refSeq: number;
  chunkCount: number;
  highlights: string[];
  subTaskStatus?: string;
  reasoning: boolean;
  textStarted: boolean;
  textDone: boolean;
  text: string;
  metadata?: Record<string, unknown>;
  followUps: string[];
  error?: ResearchError;
  invalidEvents: number;
  startedAt?: string;
  finishedAt?: string;
};

export const initialResearchState = (): ResearchState => ({
  status: "idle",
  tasks: [],
  steps: [],
  stepEventCount: 0,
  references: [],
  refSeq: 0,
  chunkCount: 0,
  highlights: [],
  reasoning: false,
  textStarted: false,
  textDone: false,
  text: "",
  followUps: [],
  invalidEvents: 0,
});

/** 애플리케이션 자체 이벤트 (서버 → 브라우저 중계 시 추가) */
export type AppEvent =
  | { type: "relife-job"; jobId: string; requestId: string; cached?: boolean }
  | { type: "relife-error"; error: ResearchError }
  | { type: "relife-end"; status: ResearchStatus }
  | { type: "relife-invalid" };

const taskSchema = z.object({
  taskId: z.union([z.number(), z.string()]),
  task: z.string().default(""),
  isComplete: z.boolean().optional(),
  status: z.string().optional(),
}).passthrough();

const errorSchema = z.object({
  code: z.string().default("UNKNOWN"),
  message: z.string().default("알 수 없는 오류"),
  retryable: z.boolean().default(false),
}).passthrough();

const str = (v: unknown, max = 300) => (typeof v === "string" ? v.slice(0, max) : undefined);

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
}

/** 참조 객체 정규화 – 안전하지 않은 URL은 버림 */
export function normalizeReference(raw: unknown): Omit<Reference, "index"> | null {
  const r = asRecord(raw);
  if (!r) return null;
  const url = str(r.url, 2000) ?? str(r.link, 2000) ?? str(r.href, 2000);
  if (!url || !isSafeExternalUrl(url)) return null;
  const title = (str(r.title) ?? str(r.name) ?? "").trim();
  return {
    url,
    title: title || hostnameOf(url),
    hostname: str(r.hostname, 200) || hostnameOf(url),
    date: str(r.date, 40) || undefined,
    snippet: str(r.snippet, 400) ?? str(r.description, 400),
  };
}

/** 긴 태스크 문자열(예: 지시문 전체)은 첫 줄만 짧게 표시 */
export function taskLabel(task: string): string {
  // 사용자 지시문 전체가 단일 태스크로 반환되는 경우 (실제 응답에서 확인) → 요약 이름으로 표시
  if (/^당신은 .*리서치 에이전트/.test(task.trim())) return "맞춤형 인생 2막 종합 리서치";
  const first = task.trim().split(/\r?\n/)[0] ?? "";
  return first.length > 90 ? first.slice(0, 90) + "…" : first;
}

/** 참조에 포함된 실제 검색어 → 사람이 읽을 수 있는 검색 단계 (site: 연산자는 기관명으로 표시) */
export function searchQueryLabel(raw: unknown): string | null {
  const q = asRecord(raw)?.searchQuery;
  if (typeof q !== "string" || !q.trim()) return null;
  const m = q.trim().match(/^site:(\S+)\s+(.*)$/);
  const label = m ? `${m[1].replace(/^www\./, "")}에서 “${m[2]}” 검색` : `“${q.trim()}” 검색`;
  return label.slice(0, 160);
}

const STEP_LABEL_KEYS = ["query", "title", "step", "description", "message", "task", "label", "name"];

/** data-search-step 페이로드에서 사람이 읽을 수 있는 실제 문자열만 추출. 없으면 null (표시하지 않음) */
export function extractStepLabel(payload: Record<string, unknown>): string | null {
  const candidates = [asRecord(payload.data), payload];
  for (const c of candidates) {
    if (!c) continue;
    for (const k of STEP_LABEL_KEYS) {
      const v = c[k];
      if (typeof v === "string" && v.trim()) return v.trim().slice(0, 200);
      if (Array.isArray(v)) {
        const s = v.filter((x) => typeof x === "string").join(", ");
        if (s) return s.slice(0, 200);
      }
    }
  }
  return null;
}

/** 순수 리듀서: 동일한 로직을 서버(저장)와 브라우저(표시)에서 사용 */
export function reduceResearchEvent(state: ResearchState, evt: unknown): ResearchState {
  const e = asRecord(evt);
  if (!e || typeof e.type !== "string") return { ...state, invalidEvents: state.invalidEvents + 1 };
  const data = asRecord(e.data);

  switch (e.type) {
    case "relife-job":
      return { ...state, status: "connecting", jobId: str(e.jobId, 100), requestId: str(e.requestId, 100), startedAt: state.startedAt ?? new Date().toISOString() };
    case "relife-error": {
      const err = errorSchema.safeParse(e.error);
      const error = err.success ? { ...err.data, httpStatus: typeof asRecord(e.error)?.httpStatus === "number" ? (asRecord(e.error)!.httpStatus as number) : undefined } : { code: "UNKNOWN", message: "오류", retryable: false };
      const status: ResearchStatus = error.code === "TIMEOUT" ? "timeout" : error.code === "NETWORK_INTERRUPTED" ? "interrupted" : error.code === "ABORTED" ? "aborted" : "failed";
      return { ...state, status, error, finishedAt: new Date().toISOString() };
    }
    case "relife-end": {
      const s = str(e.status, 20) as ResearchStatus | undefined;
      return { ...state, status: s ?? state.status, finishedAt: state.finishedAt ?? new Date().toISOString() };
    }
    case "relife-invalid":
      return { ...state, invalidEvents: state.invalidEvents + 1 };

    case "start": {
      const meta = asRecord(e.message_metadata);
      return { ...state, status: "running", messageId: str(e.message_id, 100), traceId: str(meta?.trace_id, 200), requestId: str(meta?.request_id, 100) ?? state.requestId };
    }
    case "start-step":
    case "finish-step":
    case "reasoning-delta": // 내부 추론 텍스트는 표시·저장하지 않음
      return state.status === "connecting" ? { ...state, status: "running" } : state;
    case "reasoning-start":
      return { ...state, status: "running", reasoning: true };
    case "reasoning-end":
      return { ...state, reasoning: false };

    case "data-search-tasks": {
      const list = Array.isArray(data?.tasks) ? data!.tasks : [];
      const map = new Map(state.tasks.map((t) => [t.taskId, t]));
      for (const raw of list) {
        const p = taskSchema.safeParse(raw);
        if (!p.success) continue;
        const id = String(p.data.taskId);
        const prev = map.get(id);
        const status = p.data.status;
        const isComplete = p.data.isComplete ?? (status ? status === "completed" : prev?.isComplete ?? false);
        map.set(id, { taskId: id, task: taskLabel(p.data.task) || prev?.task || "", isComplete, status });
      }
      const sub = typeof data?.subTaskStatus === "string" ? data.subTaskStatus.slice(0, 30) : state.subTaskStatus;
      return { ...state, status: "running", tasks: [...map.values()], subTaskStatus: sub };
    }
    case "data-search-step": {
      const label = extractStepLabel(e);
      const key = str(e.id, 100) ?? `step-${state.stepEventCount}`;
      const steps = label && !state.steps.some((s) => s.label === label) ? [...state.steps, { key, label }].slice(-100) : state.steps;
      return { ...state, status: "running", steps, stepEventCount: state.stepEventCount + 1 };
    }
    case "data-search-references": {
      const list = Array.isArray(data?.references) ? data!.references : [];
      const refs = [...state.references];
      let seq = state.refSeq;
      const steps = [...state.steps];
      for (const raw of list) {
        seq++; // 안전하지 않아 버린 참조도 번호는 소비 (인용 번호 정합성 유지)
        const r = normalizeReference(raw);
        if (r && refs.length < 400) refs.push({ ...r, index: seq });
        const q = searchQueryLabel(raw);
        if (q && !steps.some((x) => x.label === q) && steps.length < 100) steps.push({ key: `q-${steps.length}`, label: q });
      }
      return { ...state, status: "running", references: refs, refSeq: seq, steps };
    }
    case "data-search-chunks": {
      const list = Array.isArray(data?.referenceChunks) ? data!.referenceChunks : [];
      let refs = state.references;
      for (const raw of list) {
        const c = asRecord(raw);
        const url = str(c?.sourceUrl, 2000) ?? str(c?.url, 2000);
        const content = str(c?.content, 400) ?? str(c?.text, 400) ?? str(c?.chunk, 400);
        if (url && content) refs = refs.map((r) => (r.url === url && !r.snippet ? { ...r, snippet: content } : r));
      }
      return { ...state, references: refs, chunkCount: state.chunkCount + list.length };
    }
    case "text-start":
      return { ...state, status: "running", textStarted: true };
    case "text-delta": {
      const d = typeof e.delta === "string" ? e.delta : "";
      return { ...state, status: "running", textStarted: true, text: (state.text + d).slice(0, 400_000) };
    }
    case "text-end":
      return { ...state, textDone: true };
    case "data-highlight-phrases": {
      const hs = Array.isArray(data?.highlightPhrases) ? data!.highlightPhrases.filter((h): h is string => typeof h === "string").map((h) => h.slice(0, 500)) : [];
      return { ...state, highlights: hs.slice(0, 5) };
    }
    case "data-metadata":
      return { ...state, metadata: data ?? undefined };
    case "data-follow-up-questions": {
      const fq = asRecord(data?.followUpQuestion);
      const arr = Array.isArray(data?.questions) ? data!.questions : Array.isArray(fq?.queries) ? (fq!.queries as unknown[]) : [];
      const qs = arr.filter((q): q is string => typeof q === "string").map((q) => q.replace(/\*\*/g, "").slice(0, 200));
      return { ...state, followUps: qs.slice(0, 10) };
    }
    case "data-error": {
      const p = errorSchema.safeParse(data ?? {});
      const error = p.success ? { code: p.data.code, message: p.data.message, retryable: p.data.retryable } : { code: "UNKNOWN", message: "알 수 없는 오류", retryable: false };
      return { ...state, status: "failed", error, finishedAt: new Date().toISOString() };
    }
    case "finish":
      return { ...state, status: state.error ? state.status : "completed", finishedAt: new Date().toISOString() };
    default:
      return state; // 알 수 없는 이벤트는 무시 (앱 동작 변경 불가)
  }
}

export const isTerminal = (s: ResearchStatus) => ["completed", "failed", "aborted", "timeout", "interrupted"].includes(s);
