"use client";
import { useState } from "react";
import { Bookmark, BookmarkCheck, ExternalLink, ListPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/common";
import { useAppData } from "@/lib/data/store";
import type { Recommendation } from "@/lib/report/structured";
import { isSafeExternalUrl } from "@/lib/security/url";

const CATEGORY_PAGE: Record<string, string> = { job: "/jobs", education: "/education", certificate: "/education", support: "/support", startup: "/support", retirement: "/retirement" };

/** 추천 정보 링크: 공식 URL 이 있으면 그 주소, 없으면 해당 분야 메뉴 */
export function recommendationHref(rec: Recommendation): { href: string; external: boolean } {
  if (rec.url && isSafeExternalUrl(rec.url)) return { href: rec.url, external: true };
  return { href: CATEGORY_PAGE[rec.category] ?? "/report", external: false };
}

const FIELDS: [keyof Recommendation, string][] = [
  ["organization", "운영 기관"],
  ["target", "참여 대상"],
  ["eligibility", "신청 자격"],
  ["period", "모집·신청 기간"],
  ["content", "지원 내용"],
  ["cost", "비용·지원금"],
  ["duration", "기간"],
  ["fitReason", "나에게 맞는 이유"],
  ["checkedAt", "정보 확인 기준일"],
];

export function RecommendationCard({ rec, demo }: { rec: Recommendation; demo?: boolean }) {
  const { toggleBookmark, isBookmarked, addTaskFromRecommendation } = useAppData();
  const [added, setAdded] = useState(false);
  const saved = isBookmarked(rec);
  return (
    <article className="flex h-full flex-col rounded-2xl bg-white p-5 ring-1 ring-border">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-lg font-bold">
          {rec.url && isSafeExternalUrl(rec.url) ? (
            <a href={rec.url} target="_blank" rel="noopener noreferrer nofollow" className="text-primary underline-offset-4 hover:underline">
              {rec.title}
              <ExternalLink className="ml-1 inline size-4 align-[-2px]" aria-hidden />
              <span className="sr-only"> (공식 페이지 새 창)</span>
            </a>
          ) : (
            rec.title
          )}
        </h3>
        <StatusPill status={rec.status} />
      </div>
      <dl className="mt-3 grid flex-1 gap-1.5 text-[0.95rem]">
        {FIELDS.map(([k, label]) =>
          rec[k] ? (
            <div key={k} className="grid grid-cols-[7rem_1fr] gap-2">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="break-words">{String(rec[k])}</dd>
            </div>
          ) : null,
        )}
      </dl>
      {demo && <p className="mt-2 text-sm text-accent-foreground">데모 예시입니다. 실제 내용은 공식 사이트에서 확인하세요.</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {rec.url && (
          <a href={rec.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3.5 text-sm font-semibold hover:bg-muted">
            공식 링크 <ExternalLink className="size-4" aria-hidden /><span className="sr-only">(새 창)</span>
          </a>
        )}
        <Button size="sm" variant="outline" onClick={() => toggleBookmark(rec)} aria-pressed={saved}>
          {saved ? <BookmarkCheck aria-hidden /> : <Bookmark aria-hidden />} {saved ? "스크랩됨" : "스크랩"}
        </Button>
        <Button size="sm" variant="outline" disabled={added} onClick={async () => { await addTaskFromRecommendation(rec); setAdded(true); }}>
          {added ? <Check aria-hidden /> : <ListPlus aria-hidden />} {added ? "실행 계획에 추가됨" : "실행 계획에 추가"}
        </Button>
      </div>
    </article>
  );
}
