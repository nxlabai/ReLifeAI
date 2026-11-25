/**
 * 실행 항목 문장 속 기관·제도 이름 → 공식 사이트 (2026-11-25 접속 확인).
 * 앞에 있는 규칙이 우선하며, 한 항목에서 같은 주소는 한 번만 연결한다.
 */
export type InstitutionLink = { label: string; url: string };

const RULES: { pattern: RegExp; label: string; url: string }[] = [
  { pattern: /중장년내일센터|생애경력설계|전직지원/, label: "고용24 중장년내일센터", url: "https://www.work24.go.kr" },
  { pattern: /고용24|워크넷|국민내일배움카드|내일배움카드|K-?디지털|직업훈련|구직등록|채용공고/i, label: "고용24", url: "https://www.work24.go.kr" },
  { pattern: /고용노동부|신중년 고용|고용지원사업/, label: "고용노동부", url: "https://www.moel.go.kr" },
  { pattern: /국민연금|내 연금|예상연금|연금 수령|수급개시/, label: "국민연금공단", url: "https://www.nps.or.kr" },
  { pattern: /퇴직연금|개인연금|통합연금/, label: "통합연금포털(금융감독원)", url: "https://100lifeplan.fss.or.kr" },
  { pattern: /금융감독원/, label: "금융감독원", url: "https://www.fss.or.kr" },
  { pattern: /서울시?\s?50\s?플러스|50플러스|50\+/, label: "서울시50플러스", url: "https://www.50plus.or.kr" },
  { pattern: /K-?MOOC|케이무크/i, label: "K-MOOC", url: "https://www.kmooc.kr" },
  { pattern: /평생학습계좌|온국민평생배움터/, label: "온국민평생배움터(평생학습계좌제)", url: "https://www.all.go.kr" },
  { pattern: /국가평생교육진흥원/, label: "국가평생교육진흥원", url: "https://www.nile.or.kr" },
  { pattern: /폴리텍/, label: "한국폴리텍대학", url: "https://www.kopo.ac.kr" },
  { pattern: /데이터분석준전문가|ADsP|SQL\s?개발자|SQLD|빅데이터분석기사|데이터자격/i, label: "데이터자격검정", url: "https://www.dataq.or.kr" },
  { pattern: /큐넷|Q-?Net|국가기술자격|기사\s?시험|산업기사|기능사|자격증 시험|응시자격|시험일정|품질경영기사|산업안전기사/i, label: "큐넷", url: "https://www.q-net.or.kr" },
  { pattern: /K-?Startup|창업지원|창업 지원|창업센터|1인 창조기업/i, label: "K-Startup", url: "https://www.k-startup.go.kr" },
  { pattern: /복지로|노인일자리|사회활동 지원/, label: "복지로", url: "https://www.bokjiro.go.kr" },
  { pattern: /건강보험|지역가입/, label: "국민건강보험공단", url: "https://www.nhis.or.kr" },
];

export function findInstitutionLinks(text: string, exclude?: string): InstitutionLink[] {
  const out: InstitutionLink[] = [];
  const excludeHost = exclude ? safeHost(exclude) : "";
  for (const r of RULES) {
    if (!r.pattern.test(text)) continue;
    if (out.some((x) => x.url === r.url) || (excludeHost && safeHost(r.url) === excludeHost)) continue;
    out.push({ label: r.label, url: r.url });
    if (out.length >= 3) break;
  }
  return out;
}

/** 알려진 공식 사이트면 기관 이름, 아니면 도메인 */
export function labelForUrl(url: string): string {
  const host = safeHost(url);
  const rule = RULES.find((r) => safeHost(r.url) === host);
  return rule ? rule.label.replace(/ 중장년내일센터$/, "") : host || "관련 링크";
}

function safeHost(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
