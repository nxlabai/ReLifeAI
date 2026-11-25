"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { ExternalLink, Search, Briefcase, GraduationCap, Landmark, PiggyBank } from "lucide-react";

const ICONS = { job: Briefcase, education: GraduationCap, support: Landmark, retirement: PiggyBank };
import { buttonVariants } from "@/components/ui/button";
import { DemoBadge, PageContainer, PageHeader } from "@/components/common";
import { RecommendationCard } from "@/components/report/recommendation-card";
import { useReportData } from "@/hooks/use-report-data";
import { useAppData } from "@/lib/data/store";
import type { RecCategory } from "@/lib/report/structured";
import { cn } from "@/lib/utils";

export type OfficialLink = { name: string; url: string; desc: string };

export function RecommendationsView({ title, description, icon: iconName, categories, links, children }: { title: string; description: string; icon: keyof typeof ICONS; categories: RecCategory[]; links: OfficialLink[]; children?: ReactNode }) {
  const { ready, data } = useAppData();
  const icon = ICONS[iconName];
  const { structured, isDemo, report } = useReportData();
  if (!ready) return null;
  const items = structured?.recommendations.filter((r) => categories.includes(r.category)) ?? [];
  const bookmarks = data.bookmarks.filter((b) => categories.includes(b.rec.category));
  const open = items.filter((r) => r.status === "open");
  const others = items.filter((r) => r.status !== "open");

  return (
    <PageContainer>
      <PageHeader title={title} icon={icon} description={description} actions={isDemo ? <DemoBadge /> : undefined} />
      {children}
      {!report ? (
        <div className="rounded-2xl border border-dashed bg-white p-6">
          <p className="font-semibold">아직 맞춤 추천 정보가 없어요.</p>
          <p className="text-muted-foreground">진단 후 AI 맞춤 리서치를 실행하면 나에게 맞는 정보가 이곳에 정리됩니다.</p>
          <Link href="/research" className={cn(buttonVariants(), "mt-4")}><Search aria-hidden /> AI 맞춤 리서치</Link>
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 ring-1 ring-border">현재 보고서에 이 분야의 구조화된 추천 항목이 없습니다. <Link href="/report" className="font-semibold text-primary underline">보고서 원문</Link>에서 관련 내용을 확인하세요.</p>
      ) : (
        <div className="space-y-8">
          {open.length > 0 && (
            <section aria-labelledby="open-h">
              <h2 id="open-h" className="text-xl font-bold">모집 중 ({open.length})</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">{open.map((r, i) => <RecommendationCard key={i} rec={r} demo={isDemo} />)}</div>
            </section>
          )}
          {others.length > 0 && (
            <section aria-labelledby="other-h">
              <h2 id="other-h" className="text-xl font-bold">모집 예정 · 종료 · 확인 필요 ({others.length})</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">{others.map((r, i) => <RecommendationCard key={i} rec={r} demo={isDemo} />)}</div>
            </section>
          )}
        </div>
      )}

      {bookmarks.length > 0 && (
        <section className="mt-10" aria-labelledby="bm-h">
          <h2 id="bm-h" className="text-xl font-bold">내가 스크랩한 정보 ({bookmarks.length})</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">{bookmarks.map((b) => <RecommendationCard key={b.id} rec={b.rec} />)}</div>
        </section>
      )}

      <section className="mt-10" aria-labelledby="links-h">
        <h2 id="links-h" className="text-xl font-bold">공식 사이트 바로가기</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((l) => (
            <li key={l.url}>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex h-full flex-col rounded-2xl bg-white p-4 ring-1 ring-border hover:ring-primary">
                <span className="flex items-center gap-1 font-bold text-primary">{l.name} <ExternalLink className="size-4" aria-hidden /><span className="sr-only">(새 창)</span></span>
                <span className="text-[0.95rem] text-muted-foreground">{l.desc}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </PageContainer>
  );
}
