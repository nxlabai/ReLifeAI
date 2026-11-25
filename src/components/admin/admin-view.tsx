"use client";
import { useEffect, useState } from "react";
import { ShieldAlert, BarChart3, RefreshCw } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/common";

type Stats = {
  overview: Record<string, number> | null;
  ageBands: { name: string; value: number }[];
  purposes: { name: string; value: number }[];
  researchDaily: { date: string; completed: number; failed: number; other: number }[];
  planProgress: { name: string; value: number }[];
  recentErrors: { created_at: string; endpoint: string; outcome: string; http_status: number | null; error_code: string | null }[];
  credits: { available: boolean; data?: unknown; status?: number | null };
};

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "#8a8a8a"];
const OV_LABEL: Record<string, string> = {
  total_users: "전체 가입자", new_users_7d: "최근 7일 가입", research_total: "AI 리서치 수행", research_completed: "리서치 완료", research_failed: "리서치 실패",
  api_calls: "Liner API 호출", users_with_plans: "실행 계획 이용자", total_tasks: "실행 항목 수", done_tasks: "완료 항목 수",
};

export function AdminView() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fetchStats = async () => {
    const res = await fetch("/api/admin/stats", { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) setErr(body.error ?? "불러오기 실패");
    else {
      setErr(null);
      setStats(body);
    }
  };
  const load = () => void fetchStats();
  useEffect(() => {
    let alive = true;
    fetch("/api/admin/stats", { cache: "no-store" })
      .then(async (res) => ({ ok: res.ok, body: await res.json().catch(() => ({})) }))
      .then(({ ok, body }) => {
        if (!alive) return;
        if (ok) setStats(body);
        else setErr(body.error ?? "불러오기 실패");
      });
    return () => {
      alive = false;
    };
  }, []);

  if (err)
    return (
      <PageContainer>
        <PageHeader title="관리자" icon={ShieldAlert} />
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-900 ring-1 ring-red-200">{err}. 관리자 계정은 Supabase에서 profiles.role 을 &apos;admin&apos;으로 지정해야 합니다.</p>
      </PageContainer>
    );
  if (!stats) return <PageContainer><p>불러오는 중…</p></PageContainer>;

  return (
    <PageContainer>
      <PageHeader title="관리자 대시보드" icon={BarChart3} description="집계 통계만 표시합니다. 개인의 진단 내용·경제 정보·보고서 본문·대화는 조회하지 않습니다." actions={<Button variant="outline" size="sm" onClick={load}><RefreshCw aria-hidden /> 새로고침</Button>} />
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {Object.entries(stats.overview ?? {}).map(([k, v]) => (
          <li key={k} className="rounded-2xl bg-white p-4 ring-1 ring-border">
            <p className="text-sm text-muted-foreground">{OV_LABEL[k] ?? k}</p>
            <p className="text-2xl font-bold text-primary">{Number(v).toLocaleString("ko-KR")}</p>
          </li>
        ))}
        <li className="rounded-2xl bg-white p-4 ring-1 ring-border">
          <p className="text-sm text-muted-foreground">Liner 잔여 크레딧</p>
          {stats.credits.available ? (
            typeof (stats.credits.data as { balance_usd?: unknown })?.balance_usd === "string" ? (
              <p className="text-2xl font-bold text-primary">
                ${Number((stats.credits.data as { balance_usd: string }).balance_usd).toFixed(2)}
                <span className="block text-xs font-normal text-muted-foreground">{String((stats.credits.data as { billing_type?: string }).billing_type ?? "")} · 약 {Math.floor(Number((stats.credits.data as { balance_usd: string }).balance_usd) / 0.2).toLocaleString("ko-KR")}회 리서치 가능 ($0.20/회 기준)</span>
              </p>
            ) : (
              <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(stats.credits.data, null, 1)}</pre>
            )
          ) : (
            <p className="text-[0.95rem]">조회 불가{stats.credits.status ? ` (HTTP ${stats.credits.status})` : ""}</p>
          )}
        </li>
      </ul>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <ChartCard title="연령대별 이용 현황"><PieBlock data={stats.ageBands} /></ChartCard>
        <ChartCard title="목적별 진단 현황"><PieBlock data={stats.purposes} /></ChartCard>
        <ChartCard title="최근 30일 AI 리서치 수행 현황">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.researchDaily}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" name="완료" stackId="a" fill="var(--chart-1)" />
              <Bar dataKey="failed" name="실패" stackId="a" fill="var(--chart-3)" />
              <Bar dataKey="other" name="진행·중단" stackId="a" fill="var(--chart-4)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="사용자별 실행 계획 진행률 분포">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.planProgress}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" name="사용자 수" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <section className="mt-8 rounded-2xl bg-white p-5 ring-1 ring-border" aria-labelledby="err-h">
        <h2 id="err-h" className="text-lg font-bold">최근 오류 (최대 50건)</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-[0.95rem]">
            <thead><tr className="text-left"><th className="border-b p-2">시각</th><th className="border-b p-2">구분</th><th className="border-b p-2">결과</th><th className="border-b p-2">HTTP</th><th className="border-b p-2">오류 코드</th></tr></thead>
            <tbody>
              {stats.recentErrors.length === 0 && <tr><td colSpan={5} className="p-3 text-muted-foreground">오류가 없습니다.</td></tr>}
              {stats.recentErrors.map((e, i) => (
                <tr key={i}><td className="border-b p-2">{new Date(e.created_at).toLocaleString("ko-KR")}</td><td className="border-b p-2">{e.endpoint}</td><td className="border-b p-2">{e.outcome}</td><td className="border-b p-2">{e.http_status ?? "-"}</td><td className="border-b p-2">{e.error_code ?? "-"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </PageContainer>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-border">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-3 h-72">{children}</div>
    </section>
  );
}

function PieBlock({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length) return <p className="text-muted-foreground">데이터가 없습니다.</p>;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" outerRadius="75%" label>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
