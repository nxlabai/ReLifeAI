import type { Metadata } from "next";
import { CoachView } from "@/components/coach/coach-view";

export const metadata: Metadata = { title: "AI 생애전환 코치" };

export default function CoachPage() {
  return <CoachView />;
}
