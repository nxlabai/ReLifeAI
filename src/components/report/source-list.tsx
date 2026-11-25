"use client";
import { ExternalLink, BadgeCheck } from "lucide-react";
import type { Reference } from "@/lib/liner/events";
import { isOfficialSource } from "@/lib/security/url";

export function SourceList({ references, cited, compact = false }: { references: Reference[]; cited?: number[]; compact?: boolean }) {
  if (!references.length) return <p className="text-muted-foreground">수집된 출처가 없습니다.</p>;
  return (
    <ol className="space-y-2">
      {references.map((r) => (
        <li key={r.index} id={`src-${r.index}`} className="flex gap-3 rounded-xl bg-white p-3 ring-1 ring-border">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary text-sm font-bold text-primary">{r.index}</span>
          <div className="min-w-0 flex-1">
            <a href={r.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-start gap-1 font-semibold text-primary underline-offset-2 hover:underline">
              <span className="break-words">{r.title}</span>
              <ExternalLink className="mt-1 size-4 shrink-0" aria-hidden />
              <span className="sr-only">(새 창에서 원문 열기)</span>
            </a>
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="break-all">{r.hostname}</span>
              {isOfficialSource(r.url) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 text-emerald-900"><BadgeCheck className="size-3.5" aria-hidden />공공·공식 기관</span>
              )}
              {r.date && <span>{r.date}</span>}
              {cited && !cited.includes(r.index) && <span>(본문 미인용)</span>}
            </p>
            {!compact && r.snippet && <p className="mt-1 line-clamp-2 text-sm">{r.snippet}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
