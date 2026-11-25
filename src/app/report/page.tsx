import type { Metadata } from "next";
import { ReportView } from "@/components/report/report-view";

export const metadata: Metadata = { title: "맞춤 분석·전략 보고서" };

export default function ReportPage() {
  return <ReportView />;
}
