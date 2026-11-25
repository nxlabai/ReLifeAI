import type { Reference } from "@/lib/liner/events";

/** Liner 인용 표기 ((1)), ((1, 2)) → 내부 링크 [1](#ref-1) 로 변환. 출처가 없는 번호는 그대로 텍스트로 둔다. */
export const CITATION_RE = /\(\((\d{1,3}(?:\s*,\s*\d{1,3})*)\)\)/g;

export function linkCitations(markdown: string, references: Pick<Reference, "index">[]): string {
  const valid = new Set(references.map((r) => r.index));
  return markdown.replace(CITATION_RE, (whole, nums: string) => {
    const list = nums.split(",").map((n) => parseInt(n.trim(), 10));
    if (!list.every((n) => valid.has(n))) return whole;
    return list.map((n) => `[\\[${n}\\]](#ref-${n})`).join("");
  });
}

/** 본문에서 실제로 인용된 출처 번호 */
export function citedIndices(markdown: string): number[] {
  const out = new Set<number>();
  for (const m of markdown.matchAll(CITATION_RE)) m[1].split(",").forEach((n) => out.add(parseInt(n.trim(), 10)));
  return [...out].sort((a, b) => a - b);
}

export type ReportSection = { title: string; body: string; level: number };

/** ## 제목 기준으로 섹션 분리 */
export function splitSections(markdown: string): ReportSection[] {
  const lines = markdown.split(/\r?\n/);
  const sections: ReportSection[] = [];
  let cur: ReportSection = { title: "", body: "", level: 0 };
  let inFence = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    const m = !inFence && /^(#{1,2})\s+(.+?)\s*#*\s*$/.exec(line);
    if (m) {
      if (cur.title || cur.body.trim()) sections.push(cur);
      cur = { title: m[2].replace(/^\d+\.\s*/, "").trim(), body: "", level: m[1].length };
    } else cur.body += line + "\n";
  }
  if (cur.title || cur.body.trim()) sections.push(cur);
  return sections;
}

export function findSection(sections: ReportSection[], keyword: string): ReportSection | undefined {
  return sections.find((s) => s.title.includes(keyword));
}
