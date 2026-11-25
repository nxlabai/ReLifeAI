import type { Metadata } from "next";
import { RecommendationsView } from "@/components/recommendations/recommendations-view";

export const metadata: Metadata = { title: "추천 교육 및 자격증" };

export default function EducationPage() {
  return (
    <RecommendationsView
      title="추천 교육 및 자격증"
      icon="education"
      description="직업훈련, 평생교육, 디지털 역량 강화 과정과 취득을 고려할 수 있는 자격증입니다."
      categories={["education", "certificate"]}
      links={[
        { name: "고용24 직업훈련", url: "https://www.work24.go.kr", desc: "국민내일배움카드 훈련과정 검색" },
        { name: "K-MOOC", url: "https://www.kmooc.kr", desc: "대학·기관 온라인 공개강좌" },
        { name: "국가평생교육진흥원", url: "https://www.nile.or.kr", desc: "평생학습계좌제 등 평생교육" },
        { name: "한국폴리텍대학", url: "https://www.kopo.ac.kr", desc: "중장년 대상 기술 교육과정" },
        { name: "큐넷", url: "https://www.q-net.or.kr", desc: "국가자격 시험 일정 및 응시 자격" },
      ]}
    />
  );
}
