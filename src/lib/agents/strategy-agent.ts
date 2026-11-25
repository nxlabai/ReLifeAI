import type { Assessment } from "@/lib/assessment/schema";
import type { StrategyScenario } from "@/lib/types";
import type { StructuredData } from "@/lib/report/structured";

/**
 * Strategy Agent (논리 모듈): Liner 보고서의 구조화 전략을 시나리오로 변환.
 * 보고서에 전략이 부족하면 프로필 기반 규칙 템플릿으로 보완 (점수 없이, '템플릿'으로 표시).
 */

type Template = Omit<StrategyScenario, "key" | "origin">;

const TEMPLATES: Record<string, Template> = {
  career: {
    id: "A", type: "career", title: "기존 경력 활용형",
    summary: "보유한 산업·직무 경험을 살려 동일·유사 분야의 중소·중견기업, 협력사, 컨설팅·자문 역할로 재취업합니다.",
    pros: ["경력 인정 가능성이 높음", "준비 기간이 비교적 짧음"], cons: ["직급·처우 하향 가능성", "동일 업계 경기 영향"],
    prepMonths: null, requiredSkills: ["경력기술서 정리", "직무 성과 정량화"], costNote: "교육비 부담 낮음 (확인 필요)", risks: ["채용 수요 변동"],
    scores: {}, scoreBasis: undefined,
  },
  newjob: {
    id: "B", type: "newjob", title: "새로운 직업 전환형",
    summary: "직업훈련·자격증을 통해 수요가 있는 새 직무로 전환합니다.",
    pros: ["장기적 고용 가능성 확대", "새로운 성장 경험"], cons: ["교육·준비 기간 필요", "초기 소득 감소 가능"],
    prepMonths: null, requiredSkills: ["직무 교육 이수", "관련 자격 취득"], costNote: "국민내일배움카드 등 지원 여부 확인 필요", risks: ["교육 후 취업 연계 불확실"],
    scores: {}, scoreBasis: undefined,
  },
  startup: {
    id: "C", type: "startup", title: "창업 및 프리랜서형",
    summary: "전문성을 기반으로 1인 사업, 강의·자문, 프리랜서 활동을 시작합니다.",
    pros: ["시간·장소 자율성", "경험의 직접 수익화"], cons: ["소득 변동성 큼", "영업·마케팅 부담"],
    prepMonths: null, requiredSkills: ["사업계획 수립", "온라인 홍보"], costNote: "초기 자금 규모에 따라 상이 (확인 필요)", risks: ["초기 매출 불확실"],
    scores: {}, scoreBasis: undefined,
  },
  retirement: {
    id: "D", type: "retirement", title: "은퇴 및 사회참여형",
    summary: "연금·생활비를 점검하고 시간제 일자리, 사회공헌 활동, 평생학습으로 균형 있는 은퇴 생활을 설계합니다.",
    pros: ["삶의 균형", "사회적 관계 유지"], cons: ["소득 규모 제한"],
    prepMonths: null, requiredSkills: ["노후 재무 점검", "활동 기관 탐색"], costNote: "활동별 상이", risks: ["생활비 부족 가능성 점검 필요"],
    scores: {}, scoreBasis: undefined,
  },
};

/** 프로필에 맞는 템플릿 순서 */
export function templateOrder(a: Assessment): string[] {
  const order: string[] = [];
  const push = (k: string) => !order.includes(k) && order.push(k);
  if (a.priorities.includes("career") || a.goals.includes("reemploy")) push("career");
  if (a.priorities.includes("challenge") || a.goals.includes("newjob")) push("newjob");
  if (a.goals.includes("startup") || a.goals.includes("freelance")) push("startup");
  if (a.priorities.includes("retirement") || a.goals.includes("retirement") || a.goals.includes("contribution")) push("retirement");
  ["career", "newjob", "startup", "retirement"].forEach(push);
  return order;
}

export function buildScenarios(a: Assessment, data: StructuredData | null, reportId?: string, min = 3): StrategyScenario[] {
  const fromReport: StrategyScenario[] = (data?.strategies ?? []).map((s, i) => ({
    ...s,
    id: s.id || String.fromCharCode(65 + i),
    key: `${reportId ?? "r"}-${i}`,
    origin: "report",
    reportId,
  }));
  const out = [...fromReport];
  for (const k of templateOrder(a)) {
    if (out.length >= Math.max(min, fromReport.length)) break;
    if (out.some((s) => s.type === k)) continue;
    out.push({ ...TEMPLATES[k], id: String.fromCharCode(65 + out.length), key: `tpl-${k}`, origin: "template" });
  }
  return out;
}

export const SCORE_LABELS: Record<string, string> = {
  careerFit: "경력 활용도",
  prepTime: "준비 기간(짧을수록 높음)",
  cost: "비용 부담(낮을수록 높음)",
  incomeStability: "소득 안정성",
  lifeBalance: "생활 균형",
  feasibility: "실현 가능성",
};

export function hasScores(s: StrategyScenario): boolean {
  return Boolean(s.scoreBasis) && Object.values(s.scores ?? {}).some((v) => typeof v === "number");
}
