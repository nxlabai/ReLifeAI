import type { Metadata } from "next";
import { StrategyView } from "@/components/strategy/strategy-view";

export const metadata: Metadata = { title: "인생 2막 전략" };

export default function StrategyPage() {
  return <StrategyView />;
}
