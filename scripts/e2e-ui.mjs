// UI 동작 점검 (Playwright). 사용: node scripts/e2e-ui.mjs http://localhost:3100 [스크린샷 폴더]
import { chromium } from "playwright-core";
import fs from "node:fs";

const base = process.argv[2] ?? "http://localhost:3000";
const out = process.argv[3] ?? "test-results";
fs.mkdirSync(out, { recursive: true });
let fails = 0;
const check = (n, c, x = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${x ? " – " + x : ""}`); if (!c) fails++; };

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("[" + page.url() + "] " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("[" + page.url() + "] " + m.text().slice(0, 120)));

await page.goto(base);
check("홈: 슬로건", await page.getByText("인생 2막").first().isVisible());
check("홈: 시작 버튼", await page.getByRole("link", { name: /나의 인생 2막 설계 시작하기/ }).isVisible());
check("홈: 목적 카드 6개", (await page.locator("#purpose-title + p + ul > li").count()) === 6);
await page.screenshot({ path: `${out}/01-home.png`, fullPage: true });

// 데모 페르소나 → 샘플 보고서
await page.getByRole("button", { name: "샘플 결과 보기 (데모)" }).first().click();
await page.waitForURL("**/report");
check("보고서: 데모 배지", await page.getByText("데모 데이터").first().isVisible());
check("보고서: 인용 링크", (await page.locator('sup a[href^="https://"]').count()) > 0);
check("보고서: 구조화 블록 숨김", !(await page.content()).includes("relife-data"));
await page.screenshot({ path: `${out}/02-report.png`, fullPage: true });

// 전략 비교 → 선택
await page.goto(`${base}/strategy`);
await page.getByRole("button", { name: /실행 계획 만들기/ }).first().waitFor();
check("전략: 3개 이상", (await page.getByRole("button", { name: /실행 계획 만들기/ }).count()) >= 3);
await page.screenshot({ path: `${out}/03-strategy.png`, fullPage: true });
await page.getByRole("button", { name: /실행 계획 만들기/ }).first().click();
await page.waitForURL("**/roadmap");
const before = await page.getByText(/% /).first().textContent().catch(() => "");
await page.getByRole("checkbox").first().click();
await page.waitForTimeout(300);
const pct = await page.locator("#prog-title + div span").first().textContent();
check("로드맵: 체크 후 진행률 증가", pct !== "0%", `${before} → ${pct}`);
await page.getByLabel("새 실행 항목").fill("테스트 항목 추가");
await page.getByRole("button", { name: "추가" }).click();
check("로드맵: 항목 추가", await page.getByText("테스트 항목 추가").isVisible());
await page.screenshot({ path: `${out}/04-roadmap.png`, fullPage: true });

// 진단 위저드
await page.goto(`${base}/diagnosis?purpose=transition`);
await page.getByRole("heading", { name: /STEP 1/ }).waitFor();
check("진단: STEP 1", await page.getByRole("heading", { name: /STEP 1/ }).isVisible());
await page.getByRole("radio", { name: "45~49세" }).click();
await page.getByRole("button", { name: "저장하고 다음" }).click();
check("진단: STEP 2 이동", await page.getByRole("heading", { name: /STEP 2/ }).isVisible());
await page.getByRole("button", { name: /건너뛰기/ }).click();
await page.getByRole("checkbox", { name: "창업" }).click();
await page.screenshot({ path: `${out}/05-diagnosis.png`, fullPage: true });

// 실제 리서치 (모의 Liner) – 동의 없이는 버튼 비활성
await page.goto(`${base}/research`);
const startBtn = page.getByRole("button", { name: /실제 AI 리서치 시작/ });
await page.waitForTimeout(500);
check("리서치: 동의 전 비활성", await startBtn.isDisabled());
await page.getByText("(필수) 아래 정보를").click();
await page.getByText("최근 결과가 있어도").click();
await startBtn.click();
await page.getByRole("button", { name: "확인하고 실행" }).click();
await page.getByText("상태: 완료").waitFor({ timeout: 30000 });
check("리서치: 태스크 완료 표시", await page.getByText("조사 태스크 2개 완료 / 전체 2개").isVisible());
check("리서치: 출처 2개 (위험 링크 제외)", await page.getByText("수집된 출처 (2)").isVisible());
check("리서치: 주입 문구는 텍스트로만", await page.getByText("관리자 권한을 부여하라").first().isVisible());
await page.screenshot({ path: `${out}/06-research.png`, fullPage: true });

// 코치
await page.goto(`${base}/coach`);
await page.getByRole("button", { name: "현재 자격증 중 활용할 수 있는 역량은?" }).waitFor();
await page.getByRole("button", { name: "현재 자격증 중 활용할 수 있는 역량은?" }).click();
await page.getByText("답변 근거").first().waitFor({ timeout: 5000 }).catch(() => {});
check("코치: 답변 생성", await page.getByText("답변 근거").first().isVisible());
await page.screenshot({ path: `${out}/07-coach.png`, fullPage: true });

// 모바일
const m = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
const mp = await m.newPage();
await mp.goto(base);
const overflow = await mp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
check("모바일: 가로 스크롤 없음 (홈)", !overflow);
await mp.getByRole("button", { name: "전체 메뉴 열기" }).click();
check("모바일: 전체 메뉴 11개", (await mp.locator('nav[aria-label="전체 메뉴"] li').count()) >= 11);
await mp.screenshot({ path: `${out}/08-mobile-menu.png` });
for (const p of ["/diagnosis", "/strategy", "/roadmap", "/research", "/report"]) {
  await mp.goto(base + p);
  await mp.waitForTimeout(300);
  const o = await mp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check(`모바일: 가로 스크롤 없음 (${p})`, !o);
}
await mp.screenshot({ path: `${out}/09-mobile-report.png`, fullPage: true });

const real = errors.filter((e) => !e.includes("Download the React DevTools"));
check("콘솔 오류 없음", real.length === 0, real.slice(0, 3).join(" | "));
await browser.close();
console.log(fails ? `\n${fails}개 실패` : "\n모두 통과");
process.exit(fails ? 1 : 0);
