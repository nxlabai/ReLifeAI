import { Suspense } from "react";
import type { Metadata } from "next";
import { DiagnosisWizard } from "@/components/diagnosis/wizard";

export const metadata: Metadata = { title: "나의 생애전환 진단" };

export default function DiagnosisPage() {
  return (
    <Suspense>
      <DiagnosisWizard />
    </Suspense>
  );
}
