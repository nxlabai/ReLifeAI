import type { Assessment } from "@/lib/assessment/schema";
import { summarizeProfile } from "@/lib/assessment/profile";
import * as O from "@/lib/assessment/options";
import type { Reference } from "@/lib/liner/events";
import type { SavedReport } from "@/lib/types";
import { newId } from "@/lib/id";

/**
 * 데모(샘플) 보고서 – 실제 최신 검색 결과가 아닙니다.
 * 출처는 기관 공식 홈페이지 주소만 사용하며, 모집일·금액 등 구체 수치는 "확인 필요"로 둡니다.
 */

export const DEMO_REFERENCES: Reference[] = [
  { index: 1, title: "고용24 (공식 홈페이지)", url: "https://www.work24.go.kr", hostname: "work24.go.kr" },
  { index: 2, title: "고용노동부 (공식 홈페이지)", url: "https://www.moel.go.kr", hostname: "moel.go.kr" },
  { index: 3, title: "K-MOOC (공식 홈페이지)", url: "https://www.kmooc.kr", hostname: "kmooc.kr" },
  { index: 4, title: "큐넷 (공식 홈페이지)", url: "https://www.q-net.or.kr", hostname: "q-net.or.kr" },
  { index: 5, title: "국민연금공단 (공식 홈페이지)", url: "https://www.nps.or.kr", hostname: "nps.or.kr" },
  { index: 6, title: "K-Startup (공식 홈페이지)", url: "https://www.k-startup.go.kr", hostname: "k-startup.go.kr" },
  { index: 7, title: "국가평생교육진흥원 (공식 홈페이지)", url: "https://www.nile.or.kr", hostname: "nile.or.kr" },
  { index: 8, title: "한국폴리텍대학 (공식 홈페이지)", url: "https://www.kopo.ac.kr", hostname: "kopo.ac.kr" },
  { index: 9, title: "복지로 (공식 홈페이지)", url: "https://www.bokjiro.go.kr", hostname: "bokjiro.go.kr" },
  { index: 10, title: "금융감독원 (공식 홈페이지)", url: "https://www.fss.or.kr", hostname: "fss.or.kr" },
];

export function buildDemoReport(a: Assessment): SavedReport {
  const industry = O.labelsOf(O.INDUSTRIES, a.career.industries).join("·") || "기존 산업";
  const desired = a.career.desiredRole || "희망 직무";
  const region = O.labelOf(O.REGIONS, a.basic.region) || "거주 지역";
  const structured = {
    strategies: [
      {
        id: "A", type: "career", title: "기존 경력 활용형", summary: `${industry} 경력을 살려 유사 분야 중소·중견기업 또는 협력사로 재취업합니다.`,
        pros: ["경력 인정 가능성", "준비 기간 짧음"], cons: ["처우 하향 가능성"], prepMonths: 3, requiredSkills: ["경력기술서 정리", "성과 정량화"],
        costNote: "교육비 부담 낮음 (데모 예시)", risks: ["업계 채용 수요 변동"],
        scores: { careerFit: 5, prepTime: 4, cost: 4, incomeStability: 4, lifeBalance: 3, feasibility: 4 },
        scoreBasis: "데모 예시 점수: 경력 일치도와 준비 기간을 기준으로 한 가상의 평가입니다.",
      },
      {
        id: "B", type: "newjob", title: "새로운 직업 전환형", summary: `직업훈련으로 '${desired}' 분야 역량을 보완해 전환합니다.`,
        pros: ["장기 고용 가능성"], cons: ["교육 기간 필요", "초기 소득 감소"], prepMonths: 6, requiredSkills: ["직무 교육 이수", "포트폴리오"],
        costNote: "국민내일배움카드 지원 여부 확인 필요", risks: ["교육 후 취업 연계 불확실"], scores: {}, scoreBasis: null,
      },
      {
        id: "C", type: "startup", title: "프리랜서·자문형", summary: "전문성을 기반으로 강의·자문·프로젝트 단위 활동을 시작합니다.",
        pros: ["시간 자율성"], cons: ["소득 변동성"], prepMonths: 6, requiredSkills: ["개인 브랜딩", "제안서 작성"], costNote: "초기 비용 소규모 (확인 필요)", risks: ["고객 확보 불확실"], scores: {}, scoreBasis: null,
      },
    ],
    recommendations: [
      { category: "support", title: "중장년내일센터 전직지원 상담", organization: "고용노동부", target: "40세 이상 중장년 (세부 자격 확인 필요)", eligibility: "확인 필요", period: "상시 여부 확인 필요", content: "생애경력설계, 전직 상담 등", cost: "확인 필요", duration: "확인 필요", fitReason: "퇴직·전직 준비 단계에 맞는 첫 상담 창구", url: "https://www.work24.go.kr", status: "unknown", checkedAt: "데모" },
      { category: "education", title: "국민내일배움카드 직업훈련 과정 탐색", organization: "고용24", target: "확인 필요", eligibility: "확인 필요", period: "과정별 상이", content: `${desired} 관련 훈련과정 검색`, cost: "확인 필요", duration: "과정별 상이", fitReason: "희망 직무 역량 보완", url: "https://www.work24.go.kr", status: "unknown", checkedAt: "데모" },
      { category: "education", title: "K-MOOC 온라인 강좌", organization: "국가평생교육진흥원", target: "누구나", eligibility: "확인 필요", period: "강좌별 상이", content: "디지털·직무 기초 온라인 강좌", cost: "강좌별 확인 필요", duration: "강좌별 상이", fitReason: "시간·장소 제약 없이 학습", url: "https://www.kmooc.kr", status: "unknown", checkedAt: "데모" },
      { category: "certificate", title: "관련 국가기술자격 시험 일정 확인", organization: "한국산업인력공단 큐넷", target: "확인 필요", eligibility: "종목별 상이", period: "연간 시행계획 확인 필요", content: "종목별 시험 일정·응시 자격", cost: "확인 필요", duration: "확인 필요", fitReason: "경력 증빙 강화", url: "https://www.q-net.or.kr", status: "unknown", checkedAt: "데모" },
      { category: "job", title: `${region} 지역 ${industry} 분야 채용 정보 탐색`, organization: "고용24", target: "구직자", eligibility: "공고별 상이", period: "공고별 상이", content: "중장년 우대 채용 공고 검색", cost: "무료", duration: "-", fitReason: "기존 경력 활용", url: "https://www.work24.go.kr", status: "unknown", checkedAt: "데모" },
      { category: "retirement", title: "국민연금 예상 수령액 확인", organization: "국민연금공단", target: "가입자", eligibility: "-", period: "상시", content: "예상 연금액 조회 및 노후준비 상담", cost: "무료", duration: "-", fitReason: "은퇴 후 생활비 계획의 기초", url: "https://www.nps.or.kr", status: "unknown", checkedAt: "데모" },
      { category: "startup", title: "중장년 창업 지원사업 공고 확인", organization: "K-Startup", target: "확인 필요", eligibility: "사업별 상이", period: "공고별 상이", content: "창업 지원사업 통합 공고", cost: "확인 필요", duration: "확인 필요", fitReason: "프리랜서·창업 전략 검토 시 참고", url: "https://www.k-startup.go.kr", status: "unknown", checkedAt: "데모" },
    ],
    roadmap: {
      week: ["중장년내일센터 상담 예약", "경력 성과 10가지 목록 작성"],
      month1: ["경력기술서 초안 완성", "훈련과정 2~3개 비교"],
      month3: ["필요 교육 수강 시작", "지원 기업 리스트 20곳 작성"],
      month6: ["자격증 시험 응시 또는 포트폴리오 완성", "본격 지원 및 면접"],
      month12: ["새 일자리 정착 또는 전략 재설계", "노후 생활비 계획 재점검"],
    },
  };

  const md = `> ⚠️ **데모 데이터** – 이 보고서는 시연을 위한 샘플입니다. 실제 최신 검색 결과가 아니며, 모집 기간·비용·자격은 반드시 공식 사이트에서 확인하세요.

## 1. 나의 현재 상황 요약
${summarizeProfile(a)}. 전환 시점은 '${O.labelOf(O.TRANSITION_TIMING, a.basic.transitionTiming) || "미정"}'이며, 우선순위는 ${O.labelsOf(O.PRIORITIES, a.priorities).join(", ") || "미입력"}입니다.

## 2. 경력 및 핵심역량 분석
- 주요 업무: ${a.career.mainDuties || "미입력"}
- 보유 기술: ${a.career.skills || "미입력"}
- 리더십: ${O.labelOf(O.LEADERSHIP, a.career.leadership) || "미입력"}

## 3. 전환 방향 및 목표 분석
관심 목표(${O.labelsOf(O.GOALS, a.goals).join(", ") || "미입력"})를 고려할 때 경력 활용형과 전환형을 병행 검토하는 것이 좋습니다.

## 4. 보완이 필요한 역량
- 디지털 활용 능력: 현재 '${O.labelOf(O.DIGITAL, a.career.digital) || "미입력"}' 수준 → 직무별 요구 수준 확인 필요
- 경력기술서의 성과 정량화

## 5. 추천 직무 및 산업 분야
| 구분 | 직무 예시 | 적합 이유 |
| --- | --- | --- |
| 경력 활용 | ${industry} 분야 관리·자문 | 기존 경력 직접 활용 |
| 전환 | ${desired} | 희망 직무 |

## 6. 추천 교육과정 및 자격증
고용24의 국민내일배움카드 과정((1)), K-MOOC 온라인 강좌((3)), 한국폴리텍대학 중장년 과정((8))을 비교해 보세요. 자격증 일정은 큐넷에서 확인합니다((4)).

## 7. 정부지원사업 및 참여 가능 프로그램
중장년내일센터 전직지원 서비스((1, 2)) – **모집 여부 확인 필요**. 평생학습 프로그램((7)).

## 8. 경제적 준비 사항
국민연금 예상 수령액((5))과 월 생활비를 점검하세요. 복지 서비스는 복지로((9)), 금융 정보는 금융감독원((10))에서 참고할 수 있습니다. 이 내용은 참고용이며 특정 금융상품을 권유하지 않습니다.

## 9. 인생 2막 전략 시나리오
전략 A(기존 경력 활용형), 전략 B(새로운 직업 전환형), 전략 C(프리랜서·자문형)를 비교해 선택하세요. 창업 지원은 K-Startup((6))을 참고합니다.

## 10. 단계별 실행 로드맵
1개월: 상담·경력 정리 → 3개월: 교육 시작 → 6개월: 지원·포트폴리오 → 12개월: 정착 또는 재설계

## 11. 참고 자료 및 공식 출처
아래 출처 목록은 각 기관의 공식 홈페이지 주소입니다.

\`\`\`relife-data
${JSON.stringify(structured, null, 2)}
\`\`\`
`;
  return {
    id: newId(),
    source: "demo",
    status: "completed",
    title: "[데모] 인생 2막 맞춤 전략 보고서",
    markdown: md,
    references: DEMO_REFERENCES,
    tasks: [
      { taskId: "0", task: "(데모) 재취업 지원사업 조사", isComplete: true },
      { taskId: "1", task: "(데모) 교육과정 및 자격증 조사", isComplete: true },
      { taskId: "2", task: "(데모) 노후 준비 항목 조사", isComplete: true },
    ],
    createdAt: new Date().toISOString(),
  };
}
