import { assessmentSchema, type Assessment } from "@/lib/assessment/schema";

export type Persona = { id: string; name: string; headline: string; description: string; assessment: Assessment };

/** 시연용 가상 페르소나 (실존 인물 아님) */
export const PERSONAS: Persona[] = [
  {
    id: "manufacturing-52",
    name: "52세 · 제조업 관리직",
    headline: "제조업 생산관리 25년, 퇴직 준비 중",
    description: "경력을 살린 재취업과 컨설팅을 고민하고 있어요.",
    assessment: assessmentSchema.parse({
      purpose: "reemploy",
      basic: { ageBand: "50-54", region: "경남", education: "bachelor", employment: "preretire", currentJob: "자동차 부품 제조사 생산관리 부장", transitionTiming: "within1y" },
      career: {
        industries: ["manufacturing"], careerYears: "20-29", mainDuties: "생산계획 수립, 품질관리(ISO 9001), 협력사 관리, 공정 개선", leadership: "dept",
        skills: "생산관리, 품질경영, 원가절감, 협력사 관리", digital: "intermediate", certificates: "품질경영기사", desiredRole: "생산·품질 컨설턴트, 중소기업 공장장",
      },
      goals: ["reemploy", "expertise", "freelance"],
      economy: { desiredIncome: "350-500", livingCost: "250-350", eduBudget: "100-300", prepPeriod: "6-12m", pension: "yes", workHours: "fulltime", commuteArea: "창원·김해", onlineOk: true, stabilityImportance: "high" },
      priorities: ["career", "income"],
    }),
  },
  {
    id: "office-47",
    name: "47세 · 사무직",
    headline: "사무직 20년, 디지털 직무 전환 희망",
    description: "데이터 분석·디지털 마케팅 같은 새 직무에 도전하고 싶어요.",
    assessment: assessmentSchema.parse({
      purpose: "transition",
      basic: { ageBand: "45-49", region: "서울", education: "bachelor", employment: "employed", currentJob: "유통회사 총무·구매 과장", transitionTiming: "within3y" },
      career: {
        industries: ["distribution"], careerYears: "20-29", mainDuties: "구매 관리, 예산 집행, 사내 행사 기획, 엑셀 보고서 작성", leadership: "team",
        skills: "엑셀, 예산관리, 협상, 문서작성", digital: "intermediate", certificates: "컴퓨터활용능력 2급", desiredRole: "데이터 분석가, 디지털 마케터",
      },
      goals: ["newjob", "expertise"],
      economy: { desiredIncome: "250-350", livingCost: "350-500", eduBudget: "<100", prepPeriod: "3-6m", pension: "unknown", workHours: "flexible", commuteArea: "서울 전역", onlineOk: true, stabilityImportance: "mid" },
      priorities: ["challenge", "balance"],
    }),
  },
  {
    id: "retired-60",
    name: "60세 · 퇴직 완료",
    headline: "공기업 퇴직, 재취업과 노후 생활 준비",
    description: "시간제 일자리와 안정적인 노후 생활을 함께 준비하고 싶어요.",
    assessment: assessmentSchema.parse({
      purpose: "retirement",
      basic: { ageBand: "60-64", region: "대전", education: "bachelor", employment: "retired", currentJob: "공기업 시설관리 차장 (퇴직)", transitionTiming: "done" },
      career: {
        industries: ["public"], careerYears: "30+", mainDuties: "시설 유지보수 관리, 안전관리, 계약 관리", leadership: "team",
        skills: "시설관리, 안전관리, 계약 실무", digital: "basic", certificates: "전기기능사", desiredRole: "시설·안전관리 시간제 근무, 사회공헌 활동",
      },
      goals: ["reemploy", "contribution", "retirement"],
      economy: { desiredIncome: "150-250", livingCost: "250-350", eduBudget: "0", prepPeriod: "3-6m", pension: "receiving", workHours: "parttime", commuteArea: "대전·세종", onlineOk: false, stabilityImportance: "high" },
      priorities: ["retirement", "balance"],
    }),
  },
];

export const getPersona = (id: string) => PERSONAS.find((p) => p.id === id);
