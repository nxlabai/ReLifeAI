"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, CheckCircle2, Info, Plus, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { DemoBadge, EmptyState, PageContainer, PageHeader } from "@/components/common";
import { useAppData } from "@/lib/data/store";
import { useReportData } from "@/hooks/use-report-data";
import { SCORE_LABELS, buildScenarios, hasScores } from "@/lib/agents/strategy-agent";
import { buildRoadmap } from "@/lib/agents/roadmap-agent";
import type { StrategyScenario } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_OPTIONS = [
  { type: "career", label: "기존 경력 활용형" },
  { type: "newjob", label: "새로운 직업 전환형" },
  { type: "startup", label: "창업 및 프리랜서형" },
  { type: "retirement", label: "은퇴 및 사회참여형" },
];
const COLORS = ["var(--chart-1)", "var(--chart-3)", "var(--chart-2)", "var(--chart-4)", "var(--chart-5)"];

export function StrategyView() {
  const { ready, data, selectStrategy } = useAppData();
  const { report, structured, scenarios: base, isDemo } = useReportData();
  const router = useRouter();
  const [hidden, setHidden] = useState<string[]>([]);
  const [extra, setExtra] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const scenarios = useMemo(() => {
    const all = buildScenarios(data.assessment, structured, report?.id, 4);
    const list = [...base];
    for (const t of extra) {
      const tpl = all.find((s) => s.type === t && s.origin === "template") ?? buildScenarios({ ...data.assessment, goals: [], priorities: [] }, null, undefined, 4).find((s) => s.type === t);
      if (tpl && !list.some((s) => s.type === t)) list.push({ ...tpl, id: String.fromCharCode(65 + list.length) });
    }
    return list.filter((s) => !hidden.includes(s.key));
  }, [base, extra, hidden, data.assessment, structured, report?.id]);

  if (!ready) return null;

  const scored = scenarios.filter(hasScores);
  const chartData = Object.entries(SCORE_LABELS).map(([k, label]) => {
    const row: Record<string, string | number | null> = { name: label };
    scored.forEach((s) => (row[`전략 ${s.id}`] = (s.scores as Record<string, number | null>)[k] ?? null));
    return row;
  });

  const choose = async (s: StrategyScenario) => {
    setSaving(true);
    await selectStrategy(s, buildRoadmap(s, structured));
    router.push("/roadmap");
  };

  return (
    <PageContainer>
      <PageHeader
        title="인생 2막 전략 비교"
        icon={Compass}
        description="나에게 맞는 전략을 비교하고 하나를 선택하면 실행 로드맵이 만들어집니다."
        actions={isDemo ? <DemoBadge /> : undefined}
      />
      {!report && (
        <div className="mb-6">
          <EmptyState icon={Compass} title="리서치 보고서가 없어 기본 전략 틀을 보여드려요" description="AI 리서치를 실행하면 최신 정보 기반의 맞춤 전략으로 바뀝니다." href="/research" cta="AI 리서치 하기" />
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl bg-white p-4 ring-1 ring-border">
        <span className="font-semibold">비교할 전략 유형 추가:</span>
        {TYPE_OPTIONS.filter((o) => !scenarios.some((s) => s.type === o.type)).map((o) => (
          <Button key={o.type} size="sm" variant="outline" onClick={() => { setExtra((e) => [...e, o.type]); setHidden((h) => h.filter((k) => !k.endsWith(o.type))); }}>
            <Plus aria-hidden /> {o.label}
          </Button>
        ))}
        {TYPE_OPTIONS.every((o) => scenarios.some((s) => s.type === o.type)) && <span className="text-muted-foreground">모든 기본 유형이 표시 중입니다.</span>}
      </div>

      <ul className="grid gap-5 lg:grid-cols-3">
        {scenarios.map((s) => {
          const selected = data.selectedStrategy?.key === s.key;
          return (
            <li key={s.key} className={cn("flex flex-col rounded-2xl bg-white p-5 ring-1 ring-border", selected && "ring-2 ring-primary")}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-brand-orange-strong">전략 {s.id}</p>
                  <h2 className="text-xl font-bold">{s.title}</h2>
                </div>
                <button type="button" onClick={() => setHidden((h) => [...h, s.key])} className="rounded-lg p-1 text-muted-foreground hover:bg-muted" aria-label={`${s.title} 비교에서 제외`}>
                  <X className="size-5" aria-hidden />
                </button>
              </div>
              <p className="mt-1 text-sm">
                {s.origin === "report" ? <span className="rounded bg-secondary px-2 py-0.5 text-primary">{isDemo ? "데모 보고서 기반" : "AI 리서치 보고서 기반"}</span> : <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground">기본 템플릿 (리서치 근거 없음)</span>}
              </p>
              <p className="mt-3 text-[0.95rem]">{s.summary}</p>
              <dl className="mt-4 flex-1 space-y-2 text-[0.95rem]">
                <Row label="장점" items={s.pros} />
                <Row label="단점" items={s.cons} />
                <Row label="요구 역량" items={s.requiredSkills} />
                <Row label="위험 요소" items={s.risks} />
                <div className="grid grid-cols-[5.5rem_1fr] gap-2"><dt className="text-muted-foreground">준비 기간</dt><dd>{s.prepMonths != null ? `약 ${s.prepMonths}개월 (추정)` : "확인 필요"}</dd></div>
                <div className="grid grid-cols-[5.5rem_1fr] gap-2"><dt className="text-muted-foreground">예상 비용</dt><dd>{s.costNote || "확인 필요"}</dd></div>
              </dl>
              <Button className="mt-5" size="lg" variant={selected ? "outline" : "default"} disabled={saving} onClick={() => choose(s)}>
                {selected ? <><CheckCircle2 aria-hidden /> 선택됨 · 로드맵 다시 만들기</> : "이 전략으로 실행 계획 만들기"}
              </Button>
            </li>
          );
        })}
      </ul>

      <section className="mt-10 rounded-2xl bg-white p-5 ring-1 ring-border" aria-labelledby="compare-title">
        <h2 id="compare-title" className="text-xl font-bold">항목별 비교</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-[0.95rem]">
            <caption className="sr-only">전략별 경력 활용도, 준비 기간, 비용, 소득 안정성, 생활 균형, 실현 가능성 비교</caption>
            <thead>
              <tr>
                <th scope="col" className="border-b p-2 text-left">평가 항목</th>
                {scenarios.map((s) => <th key={s.key} scope="col" className="border-b p-2 text-left">전략 {s.id}<br /><span className="font-normal">{s.title}</span></th>)}
              </tr>
            </thead>
            <tbody>
              {Object.entries(SCORE_LABELS).map(([k, label]) => (
                <tr key={k}>
                  <th scope="row" className="border-b p-2 text-left font-medium">{label}</th>
                  {scenarios.map((s) => {
                    const v = hasScores(s) ? (s.scores as Record<string, number | null>)[k] : null;
                    return <td key={s.key} className="border-b p-2">{typeof v === "number" ? `${v} / 5` : <span className="text-muted-foreground">근거 없음</span>}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 flex gap-2 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />점수는 보고서가 평가 기준과 산출 근거를 함께 제시한 경우에만 표시합니다. 모든 점수는 AI의 <strong>추정치</strong>이며 확인된 사실이 아닙니다.
        </p>
        {scored.length > 0 && (
          <>
            <ul className="mt-3 space-y-1 text-sm">
              {scored.map((s) => <li key={s.key}><strong>전략 {s.id} 산출 근거:</strong> {s.scoreBasis}</li>)}
            </ul>
            <div className="mt-6 h-80" role="img" aria-label="전략별 추정 점수 막대 그래프 (위 표와 동일한 내용)">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
                  <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} />
                  <Tooltip />
                  <Legend />
                  {scored.map((s, i) => <Bar key={s.key} dataKey={`전략 ${s.id}`} fill={COLORS[i % COLORS.length]} radius={[6, 6, 0, 0]} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </section>
    </PageContainer>
  );
}

function Row({ label, items }: { label: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd><ul className="list-disc pl-4">{items.map((x, i) => <li key={i}>{x}</li>)}</ul></dd>
    </div>
  );
}
