import type { Assessment, Consent } from "./schema";
import * as O from "./options";

/** 개인 식별 가능 정보를 마스킹한다 (이메일, 전화번호, 주민등록번호, 계좌번호 형태 숫자열, URL) */
export function scrubPII(input: string): string {
  return input
    .replace(/\b\d{6}\s*[-–]\s*[1-4]\d{6}\b/g, "[주민번호 삭제]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[이메일 삭제]")
    .replace(/(\+?82[-\s]?)?0?1[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/g, "[전화번호 삭제]")
    .replace(/\b0\d{1,2}[-\s.]\d{3,4}[-\s.]\d{4}\b/g, "[전화번호 삭제]")
    .replace(/\b\d{2,6}[-\s]\d{2,6}[-\s]\d{2,8}(?:[-\s]\d{1,6})?\b/g, "[번호 삭제]")
    .replace(/https?:\/\/\S+/g, "[링크 삭제]");
}

const clean = (s?: string, max = 500) => (s ? scrubPII(s).replace(/\s+/g, " ").trim().slice(0, max) : undefined);

export type StructuredProfile = {
  purpose?: string;
  basic: Record<string, string | undefined>;
  career: Record<string, string | string[] | undefined>;
  goals: string[];
  economy?: Record<string, string | undefined>;
  priorities: string[];
};

/** 리서치에 사용할 구조화 프로필 (익명화·최소화 적용, 이름/연락처 등은 애초에 수집하지 않음) */
export function buildStructuredProfile(a: Assessment, consent?: Pick<Consent, "includeEconomy" | "includeResume">): StructuredProfile {
  const p: StructuredProfile = {
    purpose: O.labelOf(O.PURPOSES, a.purpose) || undefined,
    basic: {
      연령대: O.labelOf(O.AGE_BANDS, a.basic.ageBand) || undefined,
      거주지역: O.labelOf(O.REGIONS, a.basic.region) || undefined, // 시·도 단위만
      최종학력: O.labelOf(O.EDUCATION, a.basic.education) || undefined,
      고용상태: O.labelOf(O.EMPLOYMENT, a.basic.employment) || undefined,
      현재직무: clean(a.basic.currentJob, 100),
      전환시점: O.labelOf(O.TRANSITION_TIMING, a.basic.transitionTiming) || undefined,
    },
    career: {
      주요산업: O.labelsOf(O.INDUSTRIES, a.career.industries),
      총경력: O.labelOf(O.CAREER_YEARS, a.career.careerYears) || undefined,
      주요업무: clean(a.career.mainDuties, 600),
      리더십경험: O.labelOf(O.LEADERSHIP, a.career.leadership) || undefined,
      보유기술: clean(a.career.skills, 300),
      디지털역량: O.labelOf(O.DIGITAL, a.career.digital) || undefined,
      보유자격증: clean(a.career.certificates, 200),
      희망직무: clean(a.career.desiredRole, 150),
      경력요약: consent?.includeResume ? clean(a.career.resumeText, 1500) : undefined,
    },
    goals: O.labelsOf(O.GOALS, a.goals),
    priorities: O.labelsOf(O.PRIORITIES, a.priorities),
  };
  if (consent?.includeEconomy) {
    p.economy = {
      희망월소득: O.labelOf(O.INCOME_RANGES, a.economy.desiredIncome) || undefined,
      월생활비: O.labelOf(O.LIVING_COST, a.economy.livingCost) || undefined,
      교육투자가능액: O.labelOf(O.EDU_BUDGET, a.economy.eduBudget) || undefined,
      무소득준비가능기간: O.labelOf(O.PREP_PERIOD, a.economy.prepPeriod) || undefined,
      연금수령: O.labelOf(O.PENSION, a.economy.pension) || undefined,
      근무가능시간: O.labelOf(O.WORK_HOURS, a.economy.workHours) || undefined,
      출퇴근가능지역: clean(a.economy.commuteArea, 60),
      온라인교육: a.economy.onlineOk === undefined ? undefined : a.economy.onlineOk ? "가능" : "불가",
      경제적안정중요도: O.labelOf(O.IMPORTANCE, a.economy.stabilityImportance) || undefined,
    };
  } else {
    // 경제 정보 미동의 시에도 비민감 제약조건은 유지
    p.economy = {
      근무가능시간: O.labelOf(O.WORK_HOURS, a.economy.workHours) || undefined,
      온라인교육: a.economy.onlineOk === undefined ? undefined : a.economy.onlineOk ? "가능" : "불가",
    };
  }
  const s = (stripEmpty(p) ?? {}) as Partial<StructuredProfile>;
  return { ...s, basic: s.basic ?? {}, career: s.career ?? {}, goals: s.goals ?? [], priorities: s.priorities ?? [] };
}

function stripEmpty(v: unknown): unknown {
  if (Array.isArray(v)) return v.length ? v : undefined;
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) {
      const s = stripEmpty(val);
      if (s !== undefined && s !== "") out[k] = s;
    }
    return out;
  }
  return v;
}

export type MissingField = { step: number; key: string; label: string; importance: "high" | "normal" };

/** 입력 정보 누락 확인 (워크플로우 2단계). 누락돼도 진행은 가능하며 보고서 정확도 안내에 사용. */
export function findMissingFields(a: Assessment): MissingField[] {
  const m: MissingField[] = [];
  const add = (cond: boolean, step: number, key: string, label: string, importance: "high" | "normal" = "normal") => {
    if (cond) m.push({ step, key, label, importance });
  };
  add(!a.basic.ageBand, 1, "ageBand", "연령대", "high");
  add(!a.basic.region, 1, "region", "거주 지역", "high");
  add(!a.basic.employment, 1, "employment", "현재 고용 상태", "high");
  add(!a.basic.currentJob, 1, "currentJob", "현재 직업 및 직무");
  add(!a.basic.transitionTiming, 1, "transitionTiming", "퇴직/이직 예정 시점");
  add(a.career.industries.length === 0, 2, "industries", "주요 근무 산업", "high");
  add(!a.career.careerYears, 2, "careerYears", "총 경력 기간", "high");
  add(!a.career.mainDuties, 2, "mainDuties", "주요 수행 업무");
  add(!a.career.digital, 2, "digital", "디지털 활용 능력");
  add(a.goals.length === 0, 3, "goals", "관심 분야 및 미래 목표", "high");
  add(a.priorities.length === 0, 5, "priorities", "맞춤 전략 방향");
  return m;
}

export function completeness(a: Assessment): number {
  const total = 11;
  return Math.round(((total - findMissingFields(a).length) / total) * 100);
}

/** 프로필 요약 문장 */
export function summarizeProfile(a: Assessment): string {
  const parts = [
    O.labelOf(O.AGE_BANDS, a.basic.ageBand),
    O.labelOf(O.REGIONS, a.basic.region),
    O.labelsOf(O.INDUSTRIES, a.career.industries).join("·"),
    a.career.careerYears ? `경력 ${O.labelOf(O.CAREER_YEARS, a.career.careerYears)}` : "",
    O.labelOf(O.EMPLOYMENT, a.basic.employment),
  ].filter(Boolean);
  return parts.join(", ") || "아직 진단 정보가 없습니다";
}
