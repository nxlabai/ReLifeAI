import { describe, expect, it } from "vitest";
import { findInstitutionLinks } from "@/lib/institution-links";

describe("실행 항목 기관 링크", () => {
  it("기관명을 공식 사이트로 연결", () => {
    expect(findInstitutionLinks("중장년내일센터 생애경력설계 상담을 신청한다").map((l) => l.url)).toEqual(["https://www.work24.go.kr"]);
    expect(findInstitutionLinks("국민연금 예상연금과 퇴직연금 유형을 조회한다").map((l) => l.label)).toEqual(["국민연금공단", "통합연금포털(금융감독원)"]);
    expect(findInstitutionLinks("서울시50플러스 무료교육 모집공고 확인")[0].url).toBe("https://www.50plus.or.kr");
    expect(findInstitutionLinks("데이터분석준전문가와 SQL개발자 중 우선 자격을 정한다")[0].url).toBe("https://www.dataq.or.kr");
  });
  it("관련 없는 문장은 링크 없음, 기존 링크와 같은 사이트는 중복 제외", () => {
    expect(findInstitutionLinks("포트폴리오 주제 2개를 선정한다")).toEqual([]);
    expect(findInstitutionLinks("고용24 채용공고 수집", "https://www.work24.go.kr/x")).toEqual([]);
  });
});
