"use client";
import { useMemo } from "react";
import { useAppData } from "@/lib/data/store";
import { parseStructuredBlock, type StructuredData } from "@/lib/report/structured";
import { splitSections } from "@/lib/report/markdown";
import { buildScenarios } from "@/lib/agents/strategy-agent";

/** 현재 선택된 보고서의 파싱 결과 (구조화 데이터, 섹션, 전략 시나리오) */
export function useReportData() {
  const { activeReport, data } = useAppData();
  return useMemo(() => {
    const parsed = activeReport ? parseStructuredBlock(activeReport.markdown) : null;
    const structured: StructuredData | null = parsed?.ok ? parsed.data : null;
    return {
      report: activeReport,
      structured,
      parseError: parsed && !parsed.ok ? parsed.reason : null,
      sections: activeReport ? splitSections(activeReport.markdown) : [],
      scenarios: buildScenarios(data.assessment, structured, activeReport?.id),
      isDemo: activeReport?.source === "demo",
    };
  }, [activeReport, data.assessment]);
}
