// 데모 영상 자동 녹화 (5분 이내, 자막 포함). 실제 Liner API를 1회 호출합니다(사용료 발생).
// 준비: 게스트 리서치를 허용한 서버 실행
//   ALLOW_GUEST_RESEARCH=true npx next start -p 3800
// 실행: node scripts/record-demo.mjs http://localhost:3800
import { chromium } from "playwright-core";
import fs from "node:fs";

const base = process.argv[2] ?? "http://localhost:3800";
const outDir = "submission/video-raw";
fs.mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: outDir, size: { width: 1280, height: 720 } }, locale: "ko-KR" });

// 화면 하단 자막 바 (모든 페이지에 주입)
await ctx.addInitScript(() => {
  const mount = () => {
    if (document.getElementById("__demo_caption")) return;
    const el = document.createElement("div");
    el.id = "__demo_caption";
    el.style.cssText = "position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:99999;max-width:88%;background:rgba(15,40,36,.92);color:#fff;font:600 19px/1.45 'Noto Sans KR',sans-serif;padding:10px 20px;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,.25);text-align:center;pointer-events:none;";
    el.textContent = sessionStorage.getItem("__cap") || "";
    el.style.display = el.textContent ? "block" : "none";
    document.body.appendChild(el);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
});

const page = await ctx.newPage();
const cap = async (text) => {
  await page.evaluate((t) => {
    sessionStorage.setItem("__cap", t);
    const el = document.getElementById("__demo_caption");
    if (el) {
      el.textContent = t;
      el.style.display = t ? "block" : "none";
    }
  }, text);
};
const smoothScroll = async (y, ms = 1500) => {
  await page.evaluate(([y]) => window.scrollTo({ top: y, behavior: "smooth" }), [y]);
  await sleep(ms);
};

const t0 = Date.now();
const log = (s) => console.log(`[${Math.round((Date.now() - t0) / 1000)}s] ${s}`);

// 1. 홈
await page.goto(base);
await cap("Re:Life AI — 40대 이후 중장년의 인생 2막을 설계하는 AI Agent");
await sleep(5000);
await cap("문제: 재취업·훈련·자격증·연금 정보가 10곳 이상 기관에 흩어져 있어 찾고 비교하기 어렵습니다");
await smoothScroll(620, 5000);
await cap("목적별 카드로 시작하거나, 예시 페르소나로 바로 체험할 수 있습니다");
await page.locator("#demo").scrollIntoViewIfNeeded();
await sleep(4000);
log("home");

// 2. 진단 (페르소나 자동 입력)
await cap("52세 제조업 관리직 페르소나 선택 → 5단계 진단이 자동으로 채워집니다");
await page.getByRole("button", { name: "진단 자동 입력 후 실제 리서치" }).first().click();
await page.waitForURL("**/diagnosis**");
await sleep(1500);
for (const step of [1, 2, 3, 4, 5]) {
  await page.getByRole("button", { name: new RegExp(`^STEP ${step}`) }).click();
  await cap(["STEP 1 기본 정보: 연령대·지역·고용 상태", "STEP 2 경력·보유역량: 산업·경력·리더십·자격증", "STEP 3 관심 분야와 목표 (복수 선택)", "STEP 4 경제 상황·제약 조건 — 모두 선택 입력, 범위로만 수집", "STEP 5 전략 방향: 기존 경력 활용·소득 안정 우선"][step - 1]);
  await sleep(step === 2 ? 4500 : 3200);
}
await page.getByRole("button", { name: /진단 완료/ }).click();
await cap("진단 결과를 AI 리서치용 구조화 프로필로 정리하고, 빠진 항목을 알려 줍니다");
await sleep(3500);
await page.getByRole("button", { name: /AI 맞춤 리서치 시작/ }).click();
await page.waitForURL("**/research");
log("diagnosis");

// 3. 동의 → 실제 Liner 호출
await sleep(1500);
await cap("외부 AI 전송 전 명시 동의 — 전송될 정보(익명화·최소화)를 미리 확인할 수 있습니다");
await page.getByText("전송될 정보 미리보기").click();
await sleep(4500);
await page.getByText("(필수) 아래 정보를").click();
await sleep(800);
await cap("Liner Deep Research Agent API를 서버에서 호출합니다 (유료 호출 전 확인)");
await page.getByRole("button", { name: /실제 AI 리서치 시작/ }).click();
await sleep(1500);
await page.getByRole("button", { name: "확인하고 실행" }).click();
log("research start");

// 4. 진행 화면 (실제 SSE 이벤트)
const captions = [
  "실시간 진행: Liner SSE 이벤트(data-search-tasks, data-search-references)를 그대로 표시 — 가짜 진행률 없음",
  "Liner가 실제로 실행한 검색어가 ‘검색 단계’로, 수집한 출처가 왼쪽 목록으로 쌓입니다",
  "출처는 공공·공식 기관 배지로 구분하고, 링크를 누르면 원문이 열립니다",
  "보고서는 text-delta 이벤트로 오른쪽에 실시간 작성됩니다",
  "본문의 인용 번호는 출처 원문과 연결됩니다 — Deep Research는 2~3분 걸립니다",
];
let i = 0;
const started = Date.now();
while (Date.now() - started < 290_000) {
  const done = await page.getByText("상태: 완료").isVisible().catch(() => false);
  const failed = await page.getByRole("alert").isVisible().catch(() => false);
  if (done || failed) break;
  await cap(captions[i % captions.length]);
  i++;
  // 진행 화면 좌우를 번갈아 보여줌
  await smoothScroll(i % 2 ? 380 : 0, 1200);
  await sleep(12_000);
}
log("research end");
await smoothScroll(0, 1000);
await cap("리서치 완료 — 보고서와 출처가 저장됩니다");
await sleep(3500);

// 5. 보고서
await page.getByRole("link", { name: /보고서 보기/ }).first().click();
await page.waitForURL("**/report");
await sleep(1500);
await cap("맞춤 보고서: 전략 요약, 단계별 타임라인, 추천 카드(모집 중·예정·확인 필요 구분)");
await smoothScroll(500, 4000);
await smoothScroll(1300, 4000);
await cap("추천 카드에서 공식 링크 열기, 스크랩, 실행 계획에 추가를 바로 할 수 있습니다");
await smoothScroll(2200, 4500);
await cap("모든 출처를 번호와 함께 보관 — 본문 인용 번호와 정확히 연결");
await page.locator("#sources").scrollIntoViewIfNeeded();
await sleep(4500);
log("report");

// 6. 전략 비교 → 로드맵
await page.goto(base + "/strategy");
await sleep(2000);
await cap("전략 비교: 3개 이상 시나리오의 장단점·준비 기간·비용·위험 — 점수는 근거가 있을 때만 표시");
await sleep(4500);
await smoothScroll(900, 4500);
await smoothScroll(0, 1200);
await cap("원하는 전략을 선택하면 실행 로드맵이 자동으로 만들어집니다");
await page.getByRole("button", { name: /실행 계획 만들기/ }).first().click();
await page.waitForURL("**/roadmap");
await sleep(2500);
await cap("이번 주~12개월 할 일, 교육·자격증·지원서·연금 확인 — 기관명은 공식 사이트로 자동 연결");
await sleep(4000);
await page.getByRole("checkbox").first().click();
await cap("체크하면 실제 진행률이 계산됩니다. 항목 추가·수정·삭제도 가능합니다");
await sleep(4000);
await smoothScroll(700, 3500);
log("roadmap");

// 7. 코치
await page.goto(base);
await sleep(1500);
await cap("메인 화면의 AI 코치 버튼 → 저장된 보고서로 답변 (최신 정보가 필요할 때만 확인 후 재조사)");
await sleep(2500);
await page.getByRole("link", { name: "AI 생애전환 코치에게 질문하기" }).click();
await page.waitForURL("**/coach");
await sleep(1500);
await page.getByRole("button", { name: "6개월 안에 재취업하려면 무엇부터 해야 할까?" }).click();
await sleep(5000);
await cap("Re:Life AI — 진단 · 조사 · 전략 · 실행 · 관리 · 재설계를 잇는 인생 2막 AI Agent");
await sleep(5000);
log("end");

await ctx.close();
await browser.close();
const files = fs.readdirSync(outDir).filter((f) => f.endsWith(".webm"));
console.log("video:", files.map((f) => `${outDir}/${f}`).join(", "));
