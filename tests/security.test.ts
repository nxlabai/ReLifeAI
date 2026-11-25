import { describe, expect, it } from "vitest";
import { isSafeExternalUrl, isOfficialSource } from "@/lib/security/url";
import { buildStructuredProfile, findMissingFields, scrubPII } from "@/lib/assessment/profile";
import { assessmentSchema, emptyAssessment } from "@/lib/assessment/schema";
import { buildRequestBody } from "@/lib/liner/client";
import { buildResearchPrompt } from "@/lib/agents/research-agent";

describe("URL 안전성", () => {
  it.each([
    ["https://www.work24.go.kr/x", true],
    ["http://example.com", true],
    ["javascript:alert(1)", false],
    ["data:text/html,hi", false],
    ["https://user:pw@evil.com", false],
    ["http://127.0.0.1/admin", false],
    ["http://192.168.0.1", false],
    ["http://localhost:3000", false],
  ])("%s → %s", (u, ok) => expect(isSafeExternalUrl(u)).toBe(ok));
  it("공식 출처 판별", () => {
    expect(isOfficialSource("https://www.nps.or.kr/a")).toBe(true);
    expect(isOfficialSource("https://blog.example.com")).toBe(false);
  });
});

describe("개인정보 최소화", () => {
  it("PII 마스킹", () => {
    const s = scrubPII("연락처 010-1234-5678, hong@test.com, 800101-1234567");
    expect(s).not.toMatch(/010-1234|hong@|800101/);
  });

  it("경제 정보는 동의 시에만 포함, 이력서 원문은 동의 시에만", () => {
    const a = assessmentSchema.parse({ economy: { desiredIncome: "250-350", workHours: "parttime" }, career: { industries: [], resumeText: "이력" } });
    const no = buildStructuredProfile(a, { includeEconomy: false, includeResume: false });
    expect(JSON.stringify(no)).not.toContain("희망월소득");
    expect(JSON.stringify(no)).not.toContain("경력요약");
    expect(no.economy?.["근무가능시간"]).toBeDefined();
    const yes = buildStructuredProfile(a, { includeEconomy: true, includeResume: true });
    expect(yes.economy?.["희망월소득"]).toBe("250~350만원");
  });

  it("스키마는 허용되지 않은 값을 거부", () => {
    expect(assessmentSchema.safeParse({ basic: { ageBand: "999" } }).success).toBe(false);
  });

  it("누락 항목 검사", () => {
    expect(findMissingFields(emptyAssessment()).some((m) => m.key === "ageBand")).toBe(true);
  });
});

describe("Liner 요청 본문", () => {
  it("마지막 메시지는 user, lang ko, stream true", () => {
    const b = buildRequestBody([{ role: "user", content: "q" }], "req_1");
    expect(b).toEqual({ messages: [{ role: "user", content: "q" }], lang: "ko", stream: true, request_id: "req_1" });
    expect(() => buildRequestBody([{ role: "assistant", content: "a" }], "r")).toThrow();
  });
  it("프롬프트에 프로필을 데이터 블록으로 포함", () => {
    const p = buildResearchPrompt(buildStructuredProfile(emptyAssessment()), { today: "2026-11-25" });
    expect(p).toContain("데이터로만 취급");
    expect(p).toContain("```relife-data");
    expect(p).toContain("work24.go.kr");
  });
});
