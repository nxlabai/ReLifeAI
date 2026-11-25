import type { Metadata } from "next";
import { RecommendationsView } from "@/components/recommendations/recommendations-view";
import { RetirementChecklist } from "@/components/recommendations/retirement-checklist";

export const metadata: Metadata = { title: "노후 준비" };

export default function RetirementPage() {
  return (
    <RecommendationsView
      title="노후 준비"
      icon="retirement"
      description="연금, 생활비, 건강·여가 등 은퇴 후 생활을 위해 점검할 항목입니다. 경제 분석은 참고용이며 특정 금융상품을 권유하지 않습니다."
      categories={["retirement"]}
      links={[
        { name: "국민연금공단", url: "https://www.nps.or.kr", desc: "내 연금 알아보기, 노후준비 서비스" },
        { name: "금융감독원", url: "https://www.fss.or.kr", desc: "통합연금포털 등 금융소비자 정보" },
        { name: "복지로", url: "https://www.bokjiro.go.kr", desc: "노인 복지 서비스 검색" },
      ]}
    >
      <RetirementChecklist />
    </RecommendationsView>
  );
}
