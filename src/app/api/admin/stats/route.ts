import { getAdminSupabase, requireAdmin } from "@/lib/supabase/server";
import { fetchCreditBalance } from "@/lib/liner/client";
import { AGE_BANDS, PURPOSES, labelOf } from "@/lib/assessment/options";


/**
 * 관리자 통계 – 집계값만 반환한다.
 * 개인 진단 내용(answers), 경제 정보, 보고서 본문, 대화 내용은 조회하지 않는다.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });
  const sb = getAdminSupabase();
  if (!sb) return Response.json({ error: "SUPABASE_SERVICE_ROLE_KEY 미설정" }, { status: 503 });

  const [overview, profiles, jobs, errors, plans, credits] = await Promise.all([
    sb.from("admin_overview").select("*").single(),
    sb.from("profiles").select("age_band, primary_purpose"),
    sb.from("research_jobs").select("status, created_at").eq("source", "liner").gt("created_at", new Date(Date.now() - 30 * 86400_000).toISOString()),
    sb.from("api_usage_logs").select("created_at, endpoint, outcome, http_status, error_code").in("outcome", ["error", "timeout", "interrupted"]).order("created_at", { ascending: false }).limit(50),
    sb.from("action_tasks").select("user_id, done"),
    fetchCreditBalance(),
  ]);

  const count = <T,>(rows: T[] | null, key: (r: T) => string) => {
    const m = new Map<string, number>();
    (rows ?? []).forEach((r) => m.set(key(r), (m.get(key(r)) ?? 0) + 1));
    return [...m.entries()].map(([name, value]) => ({ name, value }));
  };

  // 사용자별 실행 계획 이용 현황 → 사용자 식별 없이 진행률 구간 분포로만 제공
  const perUser = new Map<string, { t: number; d: number }>();
  (plans.data ?? []).forEach((r: { user_id: string; done: boolean }) => {
    const p = perUser.get(r.user_id) ?? { t: 0, d: 0 };
    p.t++;
    if (r.done) p.d++;
    perUser.set(r.user_id, p);
  });
  const buckets = { "0~24%": 0, "25~49%": 0, "50~74%": 0, "75~100%": 0 };
  perUser.forEach(({ t, d }) => {
    const pct = t ? (d / t) * 100 : 0;
    const k = pct < 25 ? "0~24%" : pct < 50 ? "25~49%" : pct < 75 ? "50~74%" : "75~100%";
    buckets[k]++;
  });

  const daily = new Map<string, { date: string; completed: number; failed: number; other: number }>();
  (jobs.data ?? []).forEach((j: { status: string; created_at: string }) => {
    const d = j.created_at.slice(0, 10);
    const e = daily.get(d) ?? { date: d, completed: 0, failed: 0, other: 0 };
    if (j.status === "completed") e.completed++;
    else if (["failed", "timeout", "interrupted"].includes(j.status)) e.failed++;
    else e.other++;
    daily.set(d, e);
  });

  return Response.json(
    {
      overview: overview.data,
      ageBands: count(profiles.data, (r: { age_band: string | null }) => labelOf(AGE_BANDS, r.age_band) || "미입력"),
      purposes: count(profiles.data, (r: { primary_purpose: string | null }) => labelOf(PURPOSES, r.primary_purpose) || "미입력"),
      researchDaily: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)),
      planProgress: Object.entries(buckets).map(([name, value]) => ({ name, value })),
      recentErrors: errors.data ?? [],
      credits: credits.ok ? { available: true, data: credits.data } : { available: false, status: credits.status ?? null },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
