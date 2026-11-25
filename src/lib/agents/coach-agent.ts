import type { Assessment } from "@/lib/assessment/schema";
import { summarizeProfile } from "@/lib/assessment/profile";
import * as O from "@/lib/assessment/options";
import { splitSections, type ReportSection } from "@/lib/report/markdown";
import { parseStructuredBlock, stripStructuredBlock, type Recommendation } from "@/lib/report/structured";
import type { SavedReport } from "@/lib/types";

/**
 * Coach Agent (논리 모듈) – 추가 AI 호출 없이 저장된 프로필·리서치 결과에서 답변을 구성.
 * 최신 정보가 필요하다고 판단되면 needsResearch=true 를 반환하고, 실제 Liner 재호출은 사용자 확인 후에만 수행.
 */

export type CoachAnswer = { content: string; basis: "profile" | "report" | "guide"; needsResearch: boolean; reason?: string };

const INTENTS: { key: string; words: string[]; sections: string[]; cats: Recommendation["category"][] }[] = [
  { key: "job", words: ["직업", "지원할", "일자리", "취업", "채용", "직무", "재취업"], sections: ["추천 직무", "직무와 산업", "직업 분야", "전환 방향", "경력 및 핵심"], cats: ["job"] },
  { key: "edu", words: ["교육", "훈련", "강좌", "배우", "무료", "과정"], sections: ["추천 교육과정", "교육과정", "평생교육", "온라인 참여", "보완이 필요한"], cats: ["education"] },
  { key: "cert", words: ["자격증", "자격", "시험"], sections: ["자격증", "추천 교육과정", "경력 및 핵심"], cats: ["certificate"] },
  { key: "support", words: ["지원사업", "지원금", "정부", "센터", "프로그램"], sections: ["정부지원사업", "지원사업"], cats: ["support"] },
  { key: "money", words: ["연금", "생활비", "노후", "은퇴", "돈", "소득"], sections: ["경제적 준비", "연금", "경제적 상황"], cats: ["retirement"] },
  { key: "startup", words: ["창업", "프리랜서", "사업"], sections: ["창업", "전략 시나리오"], cats: ["startup"] },
  { key: "plan", words: ["무엇부터", "먼저", "계획", "로드맵", "개월", "순서", "어떻게 시작"], sections: ["단계별 실행 로드맵", "실행 계획", "전략 시나리오", "준비 기간을 고려한 전략"], cats: [] },
];

const FRESH_WORDS = ["최신", "지금", "현재 모집", "이번 달", "올해", "새로 나온", "마감"];

export function answerLocally(question: string, a: Assessment, report: SavedReport | null): CoachAnswer {
  const q = question.trim();
  const intents = INTENTS.filter((i) => i.words.some((w) => q.includes(w)));
  const wantsFresh = FRESH_WORDS.some((w) => q.includes(w));
  const lines: string[] = [];

  lines.push(`**나의 상황:** ${summarizeProfile(a)}`);
  if (a.career.certificates && intents.some((i) => i.key === "cert")) lines.push(`**보유 자격증:** ${a.career.certificates}`);
  if (a.career.skills && intents.some((i) => i.key === "job" || i.key === "cert")) lines.push(`**보유 기술:** ${a.career.skills}`);
  if (intents.some((i) => i.key === "edu") && a.basic.region) lines.push(`**거주 지역:** ${O.labelOf(O.REGIONS, a.basic.region)} · 온라인 교육 ${a.economy.onlineOk === false ? "어려움" : a.economy.onlineOk ? "가능" : "미입력"}`);

  if (!report) {
    lines.push("", "아직 저장된 리서치 결과가 없어 일반적인 안내만 드릴 수 있어요. AI 맞춤 리서치를 실행하면 내 상황에 맞춘 공식 출처 기반 답변을 받을 수 있습니다.");
    lines.push(...genericGuide(intents.map((i) => i.key)));
    return { content: lines.join("\n"), basis: "guide", needsResearch: true, reason: "저장된 리서치 결과 없음" };
  }

  const sections = splitSections(stripStructuredBlock(report.markdown));
  const parsed = parseStructuredBlock(report.markdown);
  const picked = new Set<ReportSection>();
  for (const it of intents.length ? intents : INTENTS.filter((i) => i.key === "plan")) {
    for (const key of it.sections) {
      const s = sections.find((x) => x.title.includes(key));
      if (s) picked.add(s);
    }
  }
  const recs = parsed.ok ? parsed.data.recommendations.filter((r) => intents.some((i) => i.cats.includes(r.category))).slice(0, 5) : [];

  if (recs.length) {
    lines.push("", "**보고서의 관련 추천 정보**");
    for (const r of recs) lines.push(`- **${r.title}**${r.organization ? ` (${r.organization})` : ""} – ${statusLabel(r.status)}${r.fitReason ? ` · ${r.fitReason}` : ""}${r.url ? ` · [공식 링크](${r.url})` : ""}`);
  }
  if (parsed.ok && intents.some((i) => i.key === "plan")) {
    const rm = parsed.data.roadmap;
    const pairs: [string, string[] | undefined][] = [["이번 주", rm.week], ["1개월", rm.month1], ["3개월", rm.month3], ["6개월", rm.month6]];
    const lst = pairs.filter(([, v]) => v?.length);
    if (lst.length) {
      lines.push("", "**보고서의 단계별 실행 계획**");
      lst.forEach(([k, v]) => lines.push(`- ${k}: ${v!.join(", ")}`));
    }
  }
  for (const s of [...picked].slice(0, 2)) {
    const body = s.body.trim().split("\n").filter(Boolean).slice(0, 8).join("\n");
    if (body) lines.push("", `**보고서 ‘${s.title}’ 중에서**`, body);
  }

  const found = recs.length > 0 || picked.size > 0;
  if (!found) lines.push("", "저장된 보고서에서 이 질문과 직접 관련된 내용을 찾지 못했어요.");
  lines.push("", report.source === "demo" ? "_※ 현재 보고서는 데모 데이터입니다._" : `_※ ${new Date(report.createdAt).toLocaleDateString("ko-KR")} 리서치 결과 기준입니다. 모집 일정 등은 변동될 수 있습니다._`);

  return {
    content: lines.join("\n"),
    basis: found ? "report" : "profile",
    needsResearch: wantsFresh || !found,
    reason: wantsFresh ? "최신 정보 요청" : !found ? "보고서에 관련 내용 없음" : undefined,
  };
}

function statusLabel(s: string) {
  return s === "open" ? "모집 중" : s === "upcoming" ? "모집 예정" : s === "closed" ? "모집 종료" : "모집 여부 확인 필요";
}

function genericGuide(keys: string[]): string[] {
  const g: Record<string, string> = {
    job: "- 고용24(work24.go.kr)에서 중장년 채용정보를 검색하고, 가까운 중장년내일센터 상담을 받아보세요.",
    edu: "- 국민내일배움카드 훈련과정(고용24), K-MOOC 온라인 강좌, 지역 평생학습관 프로그램을 비교해 보세요.",
    cert: "- 큐넷(q-net.or.kr)에서 자격 종목별 응시 자격과 시험 일정을 확인할 수 있습니다.",
    support: "- 고용노동부·고용24의 중장년 지원 제도와 지자체 일자리센터 공고를 확인하세요.",
    money: "- 국민연금공단 ‘내 연금 알아보기’로 예상 수령액을 확인하고, 월 필수 생활비 항목을 정리해 보세요. (참고용 안내이며 금융상품 권유가 아닙니다)",
    startup: "- K-Startup(k-startup.go.kr)에서 창업 지원사업 통합 공고를 확인할 수 있습니다.",
    plan: "- 1) 진단 보완 → 2) 상담 예약 → 3) 경력기술서 정리 → 4) 교육·지원 탐색 순서로 시작해 보세요.",
  };
  const out = keys.map((k) => g[k]).filter(Boolean);
  return out.length ? out : [g.plan];
}
