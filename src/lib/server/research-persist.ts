import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResearchState } from "@/lib/liner/events";
import { parseStructuredBlock } from "@/lib/report/structured";

/** 진행 상황 스냅샷 저장 (태스크·단계·부분 텍스트) */
export async function saveJobProgress(sb: SupabaseClient, jobId: string, s: ResearchState) {
  await sb
    .from("research_jobs")
    .update({
      status: s.status === "idle" ? "connecting" : s.status,
      tasks: s.tasks,
      steps: s.steps.slice(-50),
      partial_text: s.text,
      trace_id: s.traceId ?? null,
      error_code: s.error?.code ?? null,
      error_message: s.error?.message?.slice(0, 300) ?? null,
      started_at: s.startedAt ?? null,
      finished_at: s.finishedAt ?? null,
    })
    .eq("id", jobId);
}

export async function readJobStatus(sb: SupabaseClient, jobId: string): Promise<string | null> {
  const { data } = await sb.from("research_jobs").select("status").eq("id", jobId).single();
  return data?.status ?? null;
}

/** 완료(또는 부분) 보고서와 출처, 추천 정보 저장. 반환: report id */
export async function saveReport(sb: SupabaseClient, userId: string, jobId: string, s: ResearchState, title: string): Promise<string | null> {
  if (!s.text.trim()) return null;
  const parsed = parseStructuredBlock(s.text);
  const { data: rep, error } = await sb
    .from("research_reports")
    .upsert(
      { job_id: jobId, user_id: userId, source: "liner", title, markdown: s.text, structured: parsed.ok ? parsed.data : null, parse_ok: parsed.ok },
      { onConflict: "job_id" },
    )
    .select("id")
    .single();
  if (error || !rep) return null;

  if (s.references.length) {
    await sb.from("research_sources").upsert(
      s.references.map((r) => ({
        report_id: rep.id, user_id: userId, idx: r.index, title: r.title, url: r.url, hostname: r.hostname, published_date: r.date ?? null, snippet: r.snippet ?? null,
      })),
      { onConflict: "report_id,idx" },
    );
  }
  if (parsed.ok && parsed.data.recommendations.length) {
    await sb.from("recommendations").delete().eq("report_id", rep.id);
    await sb.from("recommendations").insert(
      parsed.data.recommendations.map((r) => ({
        user_id: userId, report_id: rep.id, category: r.category, title: r.title, recruit_status: r.status, url: r.url ?? null, data: r,
      })),
    );
  }
  return rep.id as string;
}

/** API 사용 로그 – 원문/키 없이 메타데이터만 */
export async function logUsage(
  sb: SupabaseClient | null,
  entry: { userId?: string | null; jobId?: string | null; endpoint: string; outcome: string; httpStatus?: number; errorCode?: string; durationMs?: number; referenceCount?: number },
) {
  if (!sb || !entry.userId) return;
  await sb.from("api_usage_logs").insert({
    user_id: entry.userId, job_id: entry.jobId ?? null, endpoint: entry.endpoint, outcome: entry.outcome,
    http_status: entry.httpStatus ?? null, error_code: entry.errorCode ?? null, duration_ms: entry.durationMs ?? null, reference_count: entry.referenceCount ?? null,
  });
}
