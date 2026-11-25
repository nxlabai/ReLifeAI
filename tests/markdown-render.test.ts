import { describe, expect, it } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";

const hasDelete = (md: string) => JSON.stringify(unified().use(remarkParse).use(remarkGfm, { singleTilde: false }).parse(md)).includes('"delete"');

describe("보고서 Markdown", () => {
  it("한국어 범위 표기(~)는 취소선이 되지 않음", () => {
    expect(hasDelete("50~54세, 경남 거주 … 2026년 11월 24일~12월 2일")).toBe(false);
    expect(hasDelete("~~진짜 취소선~~")).toBe(true);
  });
});
