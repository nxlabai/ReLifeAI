import { z } from "zod";
import * as O from "./options";

// 모든 필드는 선택 입력. 사용자가 건너뛰어도 서비스 이용 가능.
const opt = (list: O.Option[]) => z.enum(O.valuesOf(list)).optional();
const text = (max: number) => z.string().trim().max(max).optional();
const multi = (list: O.Option[]) => z.array(z.enum(O.valuesOf(list))).max(list.length).default([]);

export const assessmentSchema = z.object({
  purpose: opt(O.PURPOSES),
  basic: z
    .object({
      ageBand: opt(O.AGE_BANDS),
      region: opt(O.REGIONS),
      education: opt(O.EDUCATION),
      employment: opt(O.EMPLOYMENT),
      currentJob: text(100),
      transitionTiming: opt(O.TRANSITION_TIMING),
    })
    .default({}),
  career: z
    .object({
      industries: multi(O.INDUSTRIES),
      careerYears: opt(O.CAREER_YEARS),
      mainDuties: text(1000),
      leadership: opt(O.LEADERSHIP),
      skills: text(500),
      digital: opt(O.DIGITAL),
      certificates: text(300),
      desiredRole: text(200),
      resumeText: text(5000),
    })
    .default({ industries: [] }),
  goals: multi(O.GOALS),
  economy: z
    .object({
      desiredIncome: opt(O.INCOME_RANGES),
      livingCost: opt(O.LIVING_COST),
      eduBudget: opt(O.EDU_BUDGET),
      prepPeriod: opt(O.PREP_PERIOD),
      pension: opt(O.PENSION),
      workHours: opt(O.WORK_HOURS),
      commuteArea: text(100),
      onlineOk: z.boolean().optional(),
      stabilityImportance: opt(O.IMPORTANCE),
    })
    .default({}),
  priorities: multi(O.PRIORITIES),
  updatedAt: z.string().optional(),
});

export type Assessment = z.infer<typeof assessmentSchema>;

export const emptyAssessment = (): Assessment => assessmentSchema.parse({});

/** 외부 AI 전송 동의 */
export const consentSchema = z.object({
  externalAi: z.literal(true),
  includeEconomy: z.boolean().default(false),
  includeResume: z.boolean().default(false),
  agreedAt: z.string(),
});
export type Consent = z.infer<typeof consentSchema>;
