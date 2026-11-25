import { describe, expect, it } from "vitest";
import { initialResearchState, reduceResearchEvent, type ResearchState } from "@/lib/liner/events";

const run = (events: unknown[], s: ResearchState = initialResearchState()) => events.reduce<ResearchState>((acc, e) => reduceResearchEvent(acc, e), s);

describe("reduceResearchEvent", () => {
  it("공식 이벤트 순서를 처리해 completed 상태", () => {
    const s = run([
      { type: "start", message_id: "msg_1", message_metadata: { request_id: "req_1", trace_id: "tr_1" } },
      { type: "start-step" },
      { type: "data-search-tasks", id: "data-search-tasks-a", data: { tasks: [{ taskId: 0, task: "재취업 지원사업 조사", isComplete: false }, { taskId: 1, task: "자격증 조사", isComplete: false }] } },
      { type: "data-search-step", id: "s1", data: { query: "중장년내일센터 서울" } },
      { type: "data-search-references", id: "r1", data: { references: [{ title: "고용24", url: "https://www.work24.go.kr/a", hostname: "work24.go.kr", date: "" }, { title: "bad", url: "javascript:alert(1)" }] } },
      { type: "data-search-tasks", id: "data-search-tasks-a", data: { tasks: [{ taskId: 0, task: "재취업 지원사업 조사", isComplete: true }] } },
      { type: "reasoning-start", id: "reasoning-1" },
      { type: "reasoning-delta", id: "reasoning-1", delta: "내부 추론" },
      { type: "reasoning-end", id: "reasoning-1" },
      { type: "text-start", id: "text-1" },
      { type: "text-delta", id: "text-1", delta: "## 1. 요약\n" },
      { type: "text-delta", id: "text-1", delta: "내용 ((1))" },
      { type: "text-end", id: "text-1" },
      { type: "finish-step" },
      { type: "finish" },
    ]);
    expect(s.status).toBe("completed");
    expect(s.traceId).toBe("tr_1");
    expect(s.tasks.find((t) => t.taskId === "0")?.isComplete).toBe(true);
    expect(s.tasks).toHaveLength(2);
    expect(s.steps.map((x) => x.label)).toEqual(["중장년내일센터 서울"]);
    expect(s.references).toHaveLength(1); // javascript: 링크 제거
    expect(s.references[0].index).toBe(1);
    expect(s.text).toBe("## 1. 요약\n내용 ((1))");
    expect(s.text).not.toContain("내부 추론");
  });

  it("status 문자열 형태의 태스크도 지원", () => {
    const s = run([{ type: "data-search-tasks", data: { tasks: [{ taskId: 3, task: "x", status: "completed" }] } }]);
    expect(s.tasks[0].isComplete).toBe(true);
  });

  it("형태를 알 수 없는 data-search-step 은 표시하지 않음", () => {
    const s = run([{ type: "data-search-step", data: { foo: 1 } }]);
    expect(s.steps).toHaveLength(0);
    expect(s.stepEventCount).toBe(1);
  });

  it("data-error 는 failed, finish 가 와도 completed 로 바뀌지 않음", () => {
    const s = run([{ type: "data-error", id: "data-error-1", data: { code: "DOWNSTREAM_ERROR", message: "x", retryable: false } }, { type: "finish" }]);
    expect(s.status).toBe("failed");
    expect(s.error?.code).toBe("DOWNSTREAM_ERROR");
  });

  it("인용 번호는 수신 순서와 일치 – 위험 링크를 버려도 번호가 밀리지 않음", () => {
    const s = run([
      { type: "data-search-references", data: { references: [{ title: "a", url: "https://a.go.kr" }, { title: "x", url: "javascript:alert(1)" }] } },
      { type: "data-search-references", data: { references: [{ title: "c", url: "https://c.go.kr" }] } },
    ]);
    expect(s.references.map((r) => [r.index, r.title])).toEqual([[1, "a"], [3, "c"]]);
    expect(s.refSeq).toBe(3);
  });

  it("실제 Liner 응답 형태(2026-11-25 수집) 처리", async () => {
    const fs = await import("node:fs");
    const events = JSON.parse(fs.readFileSync("tests/fixtures/liner-real-events.json", "utf8"));
    const s = run([...events.slice(0, 16), { type: "text-delta", id: "text-1", delta: "본문 ((2))" }, ...events.slice(16)]);
    expect(s.status).toBe("completed");
    expect(s.tasks).toHaveLength(1);
    expect(s.tasks[0].isComplete).toBe(true);
    expect(s.tasks[0].task.length).toBeLessThanOrEqual(91); // 지시문 전체가 아닌 첫 줄만
    expect(s.subTaskStatus).toBe("complete");
    expect(s.references.length).toBeGreaterThan(0);
    expect(s.references[0].index).toBe(1);
    expect(s.references[0].snippet).toBeTruthy(); // description 사용
    expect(s.steps.length).toBeGreaterThan(0); // searchQuery 기반 실제 검색 단계
    expect(s.steps[0].label).toMatch(/검색/);
    expect(s.followUps.length).toBeGreaterThan(0);
    expect(s.followUps[0]).not.toContain("**");
    expect(s.highlights.length).toBe(1);
  });

  it("알 수 없는 이벤트/잘못된 입력은 상태를 바꾸지 않음", () => {
    const s0 = initialResearchState();
    expect(reduceResearchEvent(s0, { type: "please-delete-everything" })).toEqual(s0);
    expect(reduceResearchEvent(s0, null).invalidEvents).toBe(1);
  });
});
