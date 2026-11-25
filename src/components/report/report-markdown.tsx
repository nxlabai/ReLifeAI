"use client";
import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Reference } from "@/lib/liner/events";
import { linkCitations } from "@/lib/report/markdown";
import { stripStructuredBlock } from "@/lib/report/structured";
import { isSafeExternalUrl } from "@/lib/security/url";

/**
 * 안전한 Markdown 렌더링:
 * - raw HTML 비활성화(react-markdown 기본), 이미지 미표시
 * - 외부 링크는 http(s) 검증 후 새 창 + noopener noreferrer
 * - 인용 ((n)) → 출처 원문 링크
 */
function ReportMarkdownImpl({ markdown, references }: { markdown: string; references: Reference[] }) {
  const byIndex = new Map(references.map((r) => [r.index, r]));
  const md = linkCitations(stripStructuredBlock(markdown), references);

  const components: Components = {
    a: ({ href, children }) => {
      const m = href?.match(/^#ref-(\d+)$/);
      if (m) {
        const ref = byIndex.get(Number(m[1]));
        if (!ref) return <span>{children}</span>;
        return (
          <sup>
            <a href={ref.url} target="_blank" rel="noopener noreferrer nofollow" title={`${ref.title} (${ref.hostname}) – 새 창에서 원문 열기`} aria-label={`출처 ${ref.index}: ${ref.title}, 새 창에서 열기`} className="mx-0.5 rounded bg-secondary px-1 text-xs font-bold no-underline">
              {ref.index}
            </a>
          </sup>
        );
      }
      if (href && isSafeExternalUrl(href))
        return (
          <a href={href} target="_blank" rel="noopener noreferrer nofollow">
            {children}
            <span className="sr-only"> (새 창)</span>
          </a>
        );
      return <span>{children}</span>;
    },
    img: ({ alt }) => <span className="text-muted-foreground">[이미지: {alt}]</span>,
  };

  return (
    <div className="report-md">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
        {md}
      </ReactMarkdown>
    </div>
  );
}

export const ReportMarkdown = memo(ReportMarkdownImpl);
