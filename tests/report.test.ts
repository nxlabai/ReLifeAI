import { describe, expect, it } from "vitest";
import { parseStructuredBlock, stripStructuredBlock } from "@/lib/report/structured";
import { citedIndices, linkCitations, splitSections } from "@/lib/report/markdown";
import { buildScenarios } from "@/lib/agents/strategy-agent";
import { buildRoadmap, progressOf } from "@/lib/agents/roadmap-agent";
import { emptyAssessment } from "@/lib/assessment/schema";

const block = (json: string) => "## 1. 요약\n본문\n\n```relife-data\n" + json + "\n```\n";

describe("구조화 블록 파싱", () => {
  it("정상 블록을 검증하고 잘못된 항목만 제외", () => {
    const md = block(JSON.stringify({
      strategies: [{ id: "A", title: "경력 활용", pros: ["a"], scores: { careerFit: 5, cost: 9 } }, { notTitle: 1 }],
      recommendations: [{ category: "education", title: "K-MOOC", url: "javascript:alert(1)", status: "open" }],
      roadmap: { week: ["상담 예약"] },
    }));
    const r = parseStructuredBlock(md);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.strategies).toHaveLength(1);
    expect(r.data.strategies[0].scores.cost).toBeNull(); // 범위 밖 점수 제거
    expect(r.data.recommendations[0].url).toBeUndefined(); // 위험 링크 제거
    expect(r.data.droppedItems).toBe(1);
  });

  it("JSON 오류 시 실패 결과 (원본 보고서 표시로 폴백)", () => {
    expect(parseStructuredBlock(block("{ broken")).ok).toBe(false);
    expect(parseStructuredBlock("블록 없음").ok).toBe(false);
  });

  it("표시용 본문에서 블록 제거", () => {
    expect(stripStructuredBlock(block("{}"))).not.toContain("relife-data");
  });
});

describe("인용 연결", () => {
  const refs = [{ index: 1 }, { index: 2 }];
  it("((n)) → 링크, 없는 번호는 그대로", () => {
    expect(linkCitations("A ((1)) B ((1, 2)) C ((9))", refs)).toBe("A [\\[1\\]](#ref-1) B [\\[1\\]](#ref-1)[\\[2\\]](#ref-2) C ((9))");
    expect(citedIndices("x ((2)) y ((1, 2))")).toEqual([1, 2]);
  });
  it("섹션 분리 (코드블록 안의 # 무시)", () => {
    const s = splitSections("## 1. 나의 현재 상황 요약\n내용\n```\n## 아님\n```\n## 2. 경력\nB");
    expect(s.map((x) => x.title)).toEqual(["나의 현재 상황 요약", "경력"]);
  });
});

describe("전략·로드맵", () => {
  it("보고서 전략이 부족하면 템플릿으로 최소 3개", () => {
    const sc = buildScenarios(emptyAssessment(), null);
    expect(sc.length).toBeGreaterThanOrEqual(3);
    expect(sc.every((s) => s.origin === "template")).toBe(true);
  });
  it("로드맵 진행률은 실제 완료 비율", () => {
    const plan = buildRoadmap(undefined, null);
    expect(plan.tasks.length).toBeGreaterThan(3);
    plan.tasks[0].done = true;
    expect(progressOf(plan.tasks).done).toBe(1);
    expect(progressOf([]).percent).toBe(0);
  });
});
