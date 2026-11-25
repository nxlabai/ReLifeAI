"use client";
import Link from "next/link";
import { FileText, Compass, AlertTriangle, Printer, Search, CalendarClock } from "lucide-react";
import { buttonVariants, Button } from "@/components/ui/button";
import { DemoBadge, EmptyState, PageContainer, PageHeader } from "@/components/common";
import { ReportMarkdown } from "./report-markdown";
import { SourceList } from "./source-list";
import { RecommendationCard } from "./recommendation-card";
import { useAppData } from "@/lib/data/store";
import { useReportData } from "@/hooks/use-report-data";
import { citedIndices } from "@/lib/report/markdown";
import { cn } from "@/lib/utils";

const CAT_LABEL: Record<string, string> = { job: "추천 일자리", education: "교육과정", certificate: "자격증", support: "정부지원사업", retirement: "노후 준비", startup: "창업·프리랜서" };
const ROADMAP_LABEL: [string, string][] = [["week", "이번 주"], ["month1", "1개월"], ["month3", "3개월"], ["month6", "6개월"], ["month12", "12개월"]];

export function ReportView() {
  const { ready, data, setActiveReport } = useAppData();
  const { report, structured, parseError, sections, scenarios, isDemo } = useReportData();

  if (!ready) return null;
  if (!report)
    return (
      <PageContainer>
        <PageHeader title="맞춤 분석·전략 보고서" icon={FileText} />
        <EmptyState icon={Search} title="아직 보고서가 없어요" description="진단 후 AI 맞춤 리서치를 실행하거나 데모 결과를 확인해 보세요." href="/research" cta="AI 맞춤 리서치로 이동" />
      </PageContainer>
    );

  const cited = citedIndices(report.markdown);
  const incomplete = report.status !== "completed";
  const recGroups = Object.entries(CAT_LABEL)
    .map(([k, label]) => ({ k, label, items: structured?.recommendations.filter((r) => r.category === k) ?? [] }))
    .filter((g) => g.items.length);

  return (
    <PageContainer>
      <PageHeader
        title={report.title}
        icon={FileText}
        description={`생성일 ${new Date(report.createdAt).toLocaleString("ko-KR")} · 출처 ${report.references.length}개`}
        actions={
          <>
            {isDemo && <DemoBadge />}
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer aria-hidden /> 인쇄</Button>
            <Link href="/strategy" className={cn(buttonVariants({ size: "sm" }))}><Compass aria-hidden /> 전략 비교하기</Link>
          </>
        }
      />

      {data.reports.length > 1 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <label htmlFor="report-select" className="font-semibold">보고서 선택</label>
          <select id="report-select" value={report.id} onChange={(e) => setActiveReport(e.target.value)} className="h-11 rounded-xl border bg-white px-3">
            {data.reports.map((r) => (
              <option key={r.id} value={r.id}>{r.source === "demo" ? "[데모] " : ""}{r.title}</option>
            ))}
          </select>
        </div>
      )}

      {incomplete && (
        <p role="alert" className="mb-6 flex gap-2 rounded-xl bg-amber-50 p-4 text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
          이 보고서는 조사가 완료되지 않은 부분 결과입니다 (상태: {report.status}). 내용이 누락되었을 수 있으니 <Link href="/research" className="font-semibold underline">다시 조사</Link>를 권장합니다.
        </p>
      )}
      {parseError && (
        <p className="mb-6 rounded-xl bg-muted p-4 text-[0.95rem]">
          구조화된 카드 데이터를 만들지 못해 원본 보고서를 그대로 보여드립니다. ({parseError}) 전략 비교 화면에서는 기본 전략 템플릿이 함께 제공됩니다.
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[14rem_1fr]">
        <nav aria-label="보고서 목차" className="hidden lg:block">
          <ol className="sticky top-24 space-y-1 text-[0.95rem]">
            {sections.filter((s) => s.title).map((s, i) => (
              <li key={i}><a href={`#sec-${i}`} className="block rounded-lg px-2 py-1 hover:bg-secondary">{s.title}</a></li>
            ))}
            <li><a href="#sources" className="block rounded-lg px-2 py-1 font-semibold hover:bg-secondary">참고 출처</a></li>
          </ol>
        </nav>

        <div className="min-w-0 space-y-10">
          {structured && structured.strategies.length > 0 && (
            <section aria-labelledby="strat-sum">
              <h2 id="strat-sum" className="text-xl font-bold">전략 시나리오 요약</h2>
              <ul className="mt-4 grid gap-3 md:grid-cols-3">
                {scenarios.slice(0, 4).map((s) => (
                  <li key={s.key} className="rounded-2xl bg-white p-4 ring-1 ring-border">
                    <p className="text-sm font-bold text-brand-orange-strong">전략 {s.id}</p>
                    <p className="font-bold">{s.title}</p>
                    <p className="mt-1 line-clamp-3 text-[0.95rem] text-muted-foreground">{s.summary}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {structured && Object.values(structured.roadmap).some((v) => v?.length) && (
            <section aria-labelledby="timeline">
              <h2 id="timeline" className="flex items-center gap-2 text-xl font-bold"><CalendarClock className="size-6 text-primary" aria-hidden />단계별 실행 타임라인</h2>
              <ol className="mt-4 space-y-4 border-l-4 border-secondary pl-6">
                {ROADMAP_LABEL.map(([k, label]) => {
                  const items = structured.roadmap[k as keyof typeof structured.roadmap] ?? [];
                  if (!items.length) return null;
                  return (
                    <li key={k} className="relative">
                      <span className="absolute -left-[2.15rem] top-1 size-4 rounded-full bg-primary ring-4 ring-white" aria-hidden />
                      <p className="font-bold text-primary">{label}</p>
                      <ul className="mt-1 list-disc pl-5">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {recGroups.map((g) => (
            <section key={g.k} aria-labelledby={`rec-${g.k}`}>
              <h2 id={`rec-${g.k}`} className="text-xl font-bold">{g.label} ({g.items.length})</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {g.items.map((r, i) => <RecommendationCard key={i} rec={r} demo={isDemo} />)}
              </div>
            </section>
          ))}

          <section aria-labelledby="full-report" className="rounded-2xl bg-white p-5 ring-1 ring-border sm:p-8">
            <h2 id="full-report" className="sr-only">보고서 전문</h2>
            {sections.length > 1 ? (
              sections.map((s, i) => (
                <div key={i} id={`sec-${i}`} className="scroll-mt-24">
                  <ReportMarkdown markdown={(s.title ? `${"#".repeat(Math.max(2, s.level))} ${s.title}\n` : "") + s.body} references={report.references} />
                </div>
              ))
            ) : (
              <ReportMarkdown markdown={report.markdown} references={report.references} />
            )}
          </section>

          <section id="sources" aria-labelledby="src-h" className="scroll-mt-24">
            <h2 id="src-h" className="text-xl font-bold">참고 자료 및 공식 출처 ({report.references.length})</h2>
            <p className="mt-1 text-sm text-muted-foreground">본문의 번호를 누르면 해당 원문이 새 창에서 열립니다.{isDemo && " 데모 보고서의 출처는 기관 공식 홈페이지 주소입니다."}</p>
            <div className="mt-4"><SourceList references={report.references} cited={cited} /></div>
          </section>
        </div>
      </div>
    </PageContainer>
  );
}
