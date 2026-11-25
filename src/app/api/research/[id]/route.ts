import { getCurrentUser } from "@/lib/supabase/server";
import { getJob } from "@/lib/server/job-store";
import { clientKey } from "@/lib/security/rate-limit";


const json = (status: number, body: unknown) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const UUID = /^[0-9a-f-]{36}$/i;

/** 작업 상태·보고서·출처 재조회 (연결이 끊긴 뒤 결과 복구용) */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return json(400, { error: "잘못된 ID" });
  const cur = await getCurrentUser();
  if (!cur) {
    const e = getJob(id);
    if (e && e.ownerKey === `ip:${clientKey(req)}`) return json(200, { state: e.state });
    return json(401, { error: "로그인이 필요합니다" });
  }
  const { supabase } = cur;
  const { data: job } = await supabase.from("research_jobs").select("id,request_id,status,tasks,steps,partial_text,trace_id,error_code,error_message,started_at,finished_at,created_at").eq("id", id).single();
  if (!job) return json(404, { error: "작업을 찾을 수 없습니다" });
  const { data: report } = await supabase.from("research_reports").select("id,title,markdown,parse_ok,created_at").eq("job_id", id).maybeSingle();
  const { data: sources } = report
    ? await supabase.from("research_sources").select("idx,title,url,hostname,published_date,snippet").eq("report_id", report.id).order("idx")
    : { data: [] };
  return json(200, { job, report, sources });
}

/** 조사 중단 */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return json(400, { error: "잘못된 ID" });
  const cur = await getCurrentUser();
  const e = getJob(id);
  if (cur) {
    const { data } = await cur.supabase.from("research_jobs").update({ status: "aborted", error_code: "ABORTED" }).eq("id", id).in("status", ["queued", "connecting", "running"]).select("id");
    if (!data?.length && e?.ownerKey !== cur.user.id) return json(404, { error: "진행 중인 작업이 없습니다" });
    if (e && e.ownerKey !== cur.user.id) return json(403, { error: "권한이 없습니다" });
  } else if (!e || e.ownerKey !== `ip:${clientKey(req)}`) {
    return json(404, { error: "진행 중인 작업이 없습니다" });
  }
  e?.controller.abort("user");
  return json(200, { ok: true });
}
