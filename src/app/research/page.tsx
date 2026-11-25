import type { Metadata } from "next";
import { ResearchView } from "@/components/research/research-view";

export const metadata: Metadata = { title: "AI 맞춤 리서치" };

export default function ResearchPage() {
  return <ResearchView />;
}
