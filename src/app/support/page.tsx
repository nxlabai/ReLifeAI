import type { Metadata } from "next";
import { RecommendationsView } from "@/components/recommendations/recommendations-view";

export const metadata: Metadata = { title: "정부지원사업" };

export default function SupportPage() {
  return (
    <RecommendationsView
      title="정부지원사업"
      icon="support"
      description="재취업·전직·창업과 관련해 참여할 수 있는 정부 및 지자체 지원 프로그램입니다. 모집 상태를 구분해 보여드립니다."
      categories={["support", "startup"]}
      links={[
        { name: "고용24 (중장년내일센터)", url: "https://www.work24.go.kr", desc: "생애경력설계, 전직지원 서비스" },
        { name: "고용노동부", url: "https://www.moel.go.kr", desc: "신중년 고용 지원 정책" },
        { name: "K-Startup", url: "https://www.k-startup.go.kr", desc: "창업 지원사업 통합 공고" },
        { name: "복지로", url: "https://www.bokjiro.go.kr", desc: "복지 서비스 통합 검색" },
      ]}
    />
  );
}
