// 생애전환 진단 설문 선택지. 값(value)은 저장·분석용 코드, label은 화면 표시용.

export type Option = { value: string; label: string };

const o = (value: string, label: string): Option => ({ value, label });

export const AGE_BANDS = [
  o("40-44", "40~44세"),
  o("45-49", "45~49세"),
  o("50-54", "50~54세"),
  o("55-59", "55~59세"),
  o("60-64", "60~64세"),
  o("65+", "65세 이상"),
];

export const REGIONS = [
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
].map((r) => o(r, r));

export const EDUCATION = [
  o("high", "고등학교 졸업"),
  o("college", "전문대 졸업"),
  o("bachelor", "대학교 졸업"),
  o("master", "대학원(석사) 졸업"),
  o("doctor", "대학원(박사) 졸업"),
  o("other", "기타"),
];

export const EMPLOYMENT = [
  o("employed", "재직 중"),
  o("preretire", "퇴직 예정"),
  o("retired", "퇴직 완료"),
  o("jobseeking", "구직 중"),
  o("selfemployed", "자영업·프리랜서"),
  o("other", "기타"),
];

export const TRANSITION_TIMING = [
  o("done", "이미 퇴직/이직함"),
  o("within6m", "6개월 이내"),
  o("within1y", "1년 이내"),
  o("within3y", "1~3년 이내"),
  o("over3y", "3년 이후"),
  o("undecided", "아직 정하지 않음"),
];

export const INDUSTRIES = [
  o("manufacturing", "제조업"),
  o("finance", "금융·보험"),
  o("it", "IT·통신"),
  o("construction", "건설·부동산"),
  o("distribution", "유통·서비스"),
  o("public", "공공·행정"),
  o("education", "교육"),
  o("health", "보건·의료·복지"),
  o("logistics", "물류·운송"),
  o("media", "미디어·문화"),
  o("other", "기타"),
];

export const CAREER_YEARS = [
  o("<10", "10년 미만"),
  o("10-19", "10~19년"),
  o("20-29", "20~29년"),
  o("30+", "30년 이상"),
];

export const LEADERSHIP = [
  o("none", "없음"),
  o("team", "팀/파트 리더 (10명 이하)"),
  o("dept", "부서장 (10명 초과)"),
  o("exec", "임원급"),
];

export const DIGITAL = [
  o("basic", "기초 (문서 작성, 이메일)"),
  o("intermediate", "중급 (엑셀·협업툴 능숙)"),
  o("advanced", "고급 (데이터 분석·업무 자동화)"),
  o("expert", "전문가 (개발·디지털 직무 경력)"),
];

export const GOALS = [
  o("reemploy", "기존 경력을 활용한 재취업"),
  o("newjob", "새로운 직업으로 전환"),
  o("startup", "창업"),
  o("freelance", "프리랜서"),
  o("expertise", "전문성 개발"),
  o("contribution", "사회공헌 및 봉사"),
  o("hobby", "취미 및 여가"),
  o("retirement", "안정적인 은퇴 생활"),
];

export const INCOME_RANGES = [
  o("<150", "150만원 미만"),
  o("150-250", "150~250만원"),
  o("250-350", "250~350만원"),
  o("350-500", "350~500만원"),
  o("500+", "500만원 이상"),
];

export const LIVING_COST = INCOME_RANGES;

export const EDU_BUDGET = [
  o("0", "무료 과정만"),
  o("<100", "100만원 미만"),
  o("100-300", "100~300만원"),
  o("300+", "300만원 이상"),
];

export const PREP_PERIOD = [
  o("<3m", "3개월 미만"),
  o("3-6m", "3~6개월"),
  o("6-12m", "6~12개월"),
  o("12m+", "1년 이상"),
];

export const PENSION = [
  o("yes", "수령 예정"),
  o("receiving", "수령 중"),
  o("no", "수령 예정 없음"),
  o("unknown", "잘 모름"),
];

export const WORK_HOURS = [
  o("fulltime", "전일제"),
  o("parttime", "시간제 (주 20시간 내외)"),
  o("flexible", "유연근무·재택"),
  o("weekend", "주말 위주"),
];

export const IMPORTANCE = [
  o("high", "매우 중요"),
  o("mid", "보통"),
  o("low", "낮음"),
];

export const PRIORITIES = [
  o("income", "소득 안정 우선"),
  o("career", "기존 경력 활용 우선"),
  o("challenge", "새로운 분야 도전 우선"),
  o("balance", "삶의 균형 우선"),
  o("retirement", "은퇴 및 노후 안정 우선"),
];

export const PURPOSES = [
  o("reemploy", "재취업 준비"),
  o("transition", "경력 전환"),
  o("learning", "교육 및 역량 개발"),
  o("retirement", "은퇴 및 노후 준비"),
  o("startup", "창업 및 프리랜서"),
  o("unsure", "아직 잘 모르겠어요"),
];

export function labelOf(list: Option[], value?: string | null): string {
  if (!value) return "";
  return list.find((x) => x.value === value)?.label ?? value;
}

export function labelsOf(list: Option[], values?: string[] | null): string[] {
  return (values ?? []).map((v) => labelOf(list, v));
}

export const valuesOf = (list: Option[]) => list.map((x) => x.value) as [string, ...string[]];
