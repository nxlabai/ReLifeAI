import type { Metadata } from "next";
import { RecommendationsView } from "@/components/recommendations/recommendations-view";

export const metadata: Metadata = { title: "추천 일자리" };

export default function JobsPage() {
  return (
    <RecommendationsView
      title="추천 일자리"
      icon="job"
      description="내 경력과 역량을 활용할 수 있는 직무·채용 정보입니다. 지원 전 공고 원문을 꼭 확인하세요."
      categories={["job"]}
      links={[
        { name: "고용24", url: "https://www.work24.go.kr", desc: "채용정보, 중장년 일자리, 구직 등록" },
        { name: "고용노동부", url: "https://www.moel.go.kr", desc: "고용 정책 및 중장년 지원 제도" },
        { name: "복지로", url: "https://www.bokjiro.go.kr", desc: "노인 일자리 및 사회활동 지원" },
      ]}
    />
  );
}
