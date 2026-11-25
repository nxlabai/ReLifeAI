import { z } from "zod";
import { STRUCTURED_BLOCK_TAG } from "@/lib/agents/research-agent";
import { isSafeExternalUrl } from "@/lib/security/url";

const s = (max: number) => z.string().max(max).transform((v) => v.trim());
const optStr = (max: number) => z.union([z.string(), z.null(), z.undefined()]).transform((v) => (typeof v === "string" ? v.trim().slice(0, max) : undefined)).optional();
const strList = (max = 10, len = 200) =>
  z.union([z.array(z.unknown()), z.null(), z.undefined()]).transform((v) =>
    (v ?? []).filter((x): x is string => typeof x === "string" && x.trim() !== "").map((x) => x.trim().slice(0, len)).slice(0, max),
  ).default([]);
const score = z.union([z.number(), z.null(), z.undefined()]).transform((v) => (typeof v === "number" && Number.isFinite(v) && v >= 1 && v <= 5 ? Math.round(v) : null)).optional();

export const strategySchema = z.object({
  id: optStr(10),
  type: optStr(20),
  title: s(120),
  summary: optStr(800),
  pros: strList(),
  cons: strList(),
  prepMonths: z.union([z.number(), z.string(), z.null(), z.undefined()]).transform((v) => (typeof v === "number" && v >= 0 && v < 120 ? v : null)).optional(),
  requiredSkills: strList(),
  costNote: optStr(300),
  risks: strList(),
  scores: z
    .object({ careerFit: score, prepTime: score, cost: score, incomeStability: score, lifeBalance: score, feasibility: score })
    .partial()
    .nullish()
    .transform((v) => v ?? {})
    .default({}),
  scoreBasis: optStr(600),
});

export const recommendationSchema = z.object({
  category: z.union([z.enum(["job", "education", "certificate", "support", "retirement", "startup"]), z.string()]).transform((v) =>
    ["job", "education", "certificate", "support", "retirement", "startup"].includes(v) ? (v as RecCategory) : ("support" as RecCategory),
  ),
  title: s(200),
  organization: optStr(120),
  target: optStr(300),
  eligibility: optStr(400),
  period: optStr(200),
  content: optStr(800),
  cost: optStr(200),
  duration: optStr(120),
  fitReason: optStr(500),
  url: optStr(2000).transform((v) => (v && isSafeExternalUrl(v) ? v : undefined)).optional(),
  status: z.union([z.string(), z.null(), z.undefined()]).transform((v) => (v === "open" || v === "upcoming" || v === "closed" ? v : "unknown")).default("unknown"),
  checkedAt: optStr(40),
});

export type RecCategory = "job" | "education" | "certificate" | "support" | "retirement" | "startup";

export const structuredSchema = z.object({
  strategies: z.array(z.unknown()).max(8).default([]),
  recommendations: z.array(z.unknown()).max(80).default([]),
  roadmap: z
    .object({ week: strList(15), month1: strList(15), month3: strList(15), month6: strList(15), month12: strList(15) })
    .partial()
    .nullish(),
});

export type Strategy = z.infer<typeof strategySchema>;
export type Recommendation = z.infer<typeof recommendationSchema>;
export type StructuredData = {
  strategies: Strategy[];
  recommendations: Recommendation[];
  roadmap: Partial<Record<"week" | "month1" | "month3" | "month6" | "month12", string[]>>;
  droppedItems: number;
};

export type StructuredParseResult = { ok: true; data: StructuredData } | { ok: false; reason: string };

const BLOCK_RE = new RegExp("```\\s*(?:" + STRUCTURED_BLOCK_TAG + "|json)\\s*\\n([\\s\\S]*?)```", "g");

/** 보고서에서 구조화 블록을 찾아 스키마 검증. 항목 단위로 검증해 잘못된 항목만 버림. */
export function parseStructuredBlock(markdown: string): StructuredParseResult {
  const blocks = [...markdown.matchAll(BLOCK_RE)];
  // relife-data 태그 우선, 없으면 strategies 키를 가진 마지막 json 블록
  const tagged = blocks.filter((b) => b[0].includes(STRUCTURED_BLOCK_TAG));
  const candidates = (tagged.length ? tagged : blocks.filter((b) => b[1].includes('"strategies"'))).reverse();
  if (!candidates.length) return { ok: false, reason: "구조화 데이터 블록이 없습니다" };
  for (const c of candidates) {
    let json: unknown;
    try {
      json = JSON.parse(c[1]);
    } catch {
      continue;
    }
    const top = structuredSchema.safeParse(json);
    if (!top.success) continue;
    let dropped = 0;
    const strategies = top.data.strategies.flatMap((x) => {
      const r = strategySchema.safeParse(x);
      if (!r.success || !r.data.title) return (dropped++, []);
      return [r.data];
    });
    const recommendations = top.data.recommendations.flatMap((x) => {
      const r = recommendationSchema.safeParse(x);
      if (!r.success || !r.data.title) return (dropped++, []);
      return [r.data];
    });
    return { ok: true, data: { strategies, recommendations, roadmap: top.data.roadmap ?? {}, droppedItems: dropped } };
  }
  return { ok: false, reason: "구조화 데이터의 JSON 형식 또는 스키마 검증에 실패했습니다" };
}

/** 화면 표시용으로 구조화 블록을 제거 (원본은 별도 보관) */
export function stripStructuredBlock(markdown: string): string {
  return markdown.replace(new RegExp("```\\s*" + STRUCTURED_BLOCK_TAG + "[\\s\\S]*?(```|$)", "g"), "").trimEnd();
}
