// Re:Life AI 데모 영상 녹화 (실제 배포 서비스 UI를 자동 조작)
// - CDP 스크린캐스트로 1920×1080 프레임을 기록하고, 장면·자막 시각을 markers.json 에 남깁니다.
// - 실제 Liner Deep Research API를 1회 호출합니다(사용료 발생).
// - 로그인은 서비스 관리자 키로 만든 1회용 로그인 링크를 쓰며, 이메일·키는 화면/로그에 출력하지 않습니다.
// 사용: node record.mjs [서비스 주소]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { SCENES } from "./scenario.mjs";
import { openingCard, problemCard, impactCard, endingCard } from "./cards.mjs";

const BASE = (process.argv[2] ?? "https://relife-ai-lemon.vercel.app").replace(/\/$/, "");
const OUT = path.resolve("output");
const FRAMES = path.join(OUT, "frames");
const SHOTS = path.join(OUT, "screenshots");
fs.rmSync(FRAMES, { recursive: true, force: true });
for (const d of [OUT, FRAMES, SHOTS]) fs.mkdirSync(d, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── 1. 로그인 세션 준비 (녹화 밖에서) ──
function readEnv() {
  const env = {};
  for (const line of fs.readFileSync(path.resolve("../.env.local"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}
async function loginLink() {
  const env = readEnv();
  const h = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" };
  const users = (await (await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`, { headers: h })).json()).users;
  const admin = users.find((u) => u.email === process.env.DEMO_EMAIL) ?? users[0];
  const r = await (await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/generate_link`, { method: "POST", headers: h, body: JSON.stringify({ type: "magiclink", email: admin.email }) })).json();
  return `${BASE}/auth/callback?type=magiclink&next=%2F&token_hash=${r.hashed_token ?? r.properties?.hashed_token}`;
}

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "chrome", args: ["--hide-scrollbars"] });
{
  const c = await browser.newContext();
  const p = await c.newPage();
  await p.goto(await loginLink());
  await p.waitForURL(`${BASE}/`);
  await c.storageState({ path: path.join(OUT, ".auth.json") });
  await c.close();
}

// ── 2. 녹화 컨텍스트 ──
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, storageState: path.join(OUT, ".auth.json"), locale: "ko-KR" });
fs.rmSync(path.join(OUT, ".auth.json"), { force: true }); // 세션 파일 즉시 삭제

// 가짜 커서 + 클릭 물결 + 강조 테두리 + 페이지 전환 페이드 (영상 전용 주입, 서비스 코드 변경 없음)
await ctx.addInitScript(() => {
  const setup = () => {
    if (document.getElementById("__cur")) return;
    const st = document.createElement("style");
    st.textContent = `#__cur{position:fixed;z-index:2147483647;width:30px;height:30px;pointer-events:none;transform:translate(-4px,-2px);transition:transform .08s}
#__cur svg{filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))}
.__rip{position:fixed;z-index:2147483646;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;border:4px solid #e8701f;pointer-events:none;animation:__r .7s ease-out forwards}
@keyframes __r{to{transform:scale(4.2);opacity:0}}
.__hl{position:fixed;z-index:2147483645;border:4px solid #e8701f;border-radius:14px;box-shadow:0 0 0 6px rgba(232,112,31,.25),0 0 26px rgba(232,112,31,.55);pointer-events:none;animation:__h 1.3s ease-out forwards}
@keyframes __h{0%{opacity:0;transform:scale(1.08)}20%{opacity:1;transform:scale(1)}80%{opacity:1}100%{opacity:0}}
#__fade{position:fixed;inset:0;background:#f7faf9;z-index:2147483640;pointer-events:none;opacity:1;transition:opacity .45s ease}`;
    document.head.appendChild(st);
    const fade = document.createElement("div");
    fade.id = "__fade";
    document.body.appendChild(fade);
    window.__reveal = () => (fade.style.opacity = "0");
    setTimeout(() => window.__reveal(), 2500);
    const cur = document.createElement("div");
    cur.id = "__cur";
    cur.innerHTML = '<svg width="30" height="30" viewBox="0 0 24 24"><path d="M3 2l7 19 2.6-7.6L20 11z" fill="#fff" stroke="#1d2b2a" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    let pos = [960, 540];
    try { pos = JSON.parse(sessionStorage.getItem("__pos") || "[960,540]"); } catch {}
    cur.style.left = pos[0] + "px";
    cur.style.top = pos[1] + "px";
    document.body.appendChild(cur);
    addEventListener("mousemove", (e) => {
      cur.style.left = e.clientX + "px";
      cur.style.top = e.clientY + "px";
      try { sessionStorage.setItem("__pos", JSON.stringify([e.clientX, e.clientY])); } catch {}
    }, true);
    addEventListener("mousedown", (e) => {
      const r = document.createElement("div");
      r.className = "__rip";
      r.style.left = e.clientX + "px";
      r.style.top = e.clientY + "px";
      document.body.appendChild(r);
      setTimeout(() => r.remove(), 800);
      cur.style.transform = "translate(-4px,-2px) scale(.85)";
      setTimeout(() => (cur.style.transform = "translate(-4px,-2px)"), 150);
    }, true);
    window.__hl = (x, y, w, h) => {
      const d = document.createElement("div");
      d.className = "__hl";
      Object.assign(d.style, { left: x - 8 + "px", top: y - 8 + "px", width: w + 16 + "px", height: h + 16 + "px" });
      document.body.appendChild(d);
      setTimeout(() => d.remove(), 1400);
    };
    window.__fadeOut = () => (fade.style.opacity = "1");
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup);
  else setup();
});

const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
const frames = [];
let n = 0;
cdp.on("Page.screencastFrame", async (f) => {
  const file = path.join(FRAMES, `f${String(n++).padStart(6, "0")}.jpg`);
  fs.writeFileSync(file, Buffer.from(f.data, "base64"));
  frames.push({ file: path.basename(file), t: f.metadata.timestamp });
  try {
    await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId });
  } catch {}
});

const markers = [];
const now = () => Date.now() / 1000;
const mark = (type, data = {}) => markers.push({ type, t: now(), ...data });
const caption = (scene, i) => mark("caption", { scene, text: SCENES[scene].captions[i] });
const scene = (key) => mark("scene", { scene: key, title: SCENES[key].title });

async function shot(name) {
  await page.evaluate(() => {
    for (const id of ["__cur"]) document.getElementById(id)?.style.setProperty("visibility", "hidden");
  });
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
  await page.evaluate(() => document.getElementById("__cur")?.style.setProperty("visibility", "visible"));
}
async function moveTo(x, y) {
  await page.mouse.move(x, y, { steps: 22 });
}
async function clickOn(locator, { pause = 500 } = {}) {
  await locator.scrollIntoViewIfNeeded();
  await sleep(250);
  const b = await locator.boundingBox();
  if (!b) throw new Error("element not visible");
  await page.evaluate(([x, y, w, h]) => window.__hl?.(x, y, w, h), [b.x, b.y, b.width, b.height]);
  await moveTo(b.x + b.width / 2, b.y + b.height / 2);
  await sleep(pause);
  await page.mouse.down();
  await page.mouse.up();
}
async function scrollTo(y, ms = 1600) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "smooth" }), y);
  await sleep(ms);
}
async function go(url, ready = "main h1") {
  await page.evaluate(() => window.__fadeOut?.()).catch(() => {});
  await sleep(350);
  await page.goto(url);
  await page.locator(ready).first().waitFor({ timeout: 15000 }).catch(() => {});
  await sleep(400);
  await page.evaluate(() => window.__reveal?.()).catch(() => {});
  await sleep(600);
}
async function card(html, ms) {
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => window.__reveal?.()).catch(() => {});
  await sleep(ms);
}

await cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
const T0 = now();
mark("start");

// ── 오프닝 ──
scene("opening");
caption("opening", 0);
await card(openingCard(), 5000);
await shot("00_opening");

// ── 1. 문제 제기 ──
scene("problem");
caption("problem", 0);
await card(problemCard(), 4500);
caption("problem", 1);
await sleep(4500);
await shot("01_problem");

// ── 2. 메인 화면 ──
scene("home");
caption("home", 0);
await go(BASE + "/");
await page.getByText("무엇을 준비하고 계신가요?").waitFor();
await sleep(2200);
await shot("02_home");
await moveTo(520, 560);
await sleep(600);
caption("home", 1);
await scrollTo(560, 3200);
await shot("02_home_dashboard");
await page.locator("#demo").scrollIntoViewIfNeeded();
await sleep(1400);

// ── 3. 페르소나 & 진단 ──
scene("diagnosis");
caption("diagnosis", 0);
await clickOn(page.getByRole("button", { name: "진단 자동 입력 후 실제 리서치" }).first(), { pause: 900 });
await page.waitForURL("**/diagnosis**");
await sleep(1400);
caption("diagnosis", 1);
for (const s of [1, 2]) {
  await clickOn(page.getByRole("button", { name: new RegExp(`^STEP ${s}`) }), { pause: 300 });
  await sleep(1700);
  if (s === 2) await shot("03_diagnosis_step2");
}
caption("diagnosis", 2);
await clickOn(page.getByRole("button", { name: /^STEP 4/ }), { pause: 300 });
await sleep(2300);
await shot("03_diagnosis_step4");
await clickOn(page.getByRole("button", { name: /^STEP 5/ }), { pause: 300 });
await sleep(1200);
await clickOn(page.getByRole("button", { name: /진단 완료/ }));
await page.getByText("진단이 완료되었습니다").waitFor();
caption("diagnosis", 3);
await sleep(2600);
await shot("03_diagnosis_done");
await clickOn(page.getByRole("button", { name: /AI 맞춤 리서치 시작/ }));
await page.waitForURL("**/research");

// ── 4. Liner Deep Research 실행 ──
scene("research");
caption("research", 0);
await page.getByText("외부 AI 전송 동의").waitFor();
await sleep(900);
await clickOn(page.getByText("전송될 정보 미리보기"), { pause: 300 });
await sleep(2600);
await shot("04_research_consent");
const consent = page.locator("label", { hasText: "(필수) 아래 정보를" }).locator('[role="checkbox"]');
if ((await consent.getAttribute("aria-checked")) !== "true") await clickOn(consent, { pause: 300 });
await sleep(600);
// 같은 조건 최근 결과가 있으면 캐시를 쓰므로, 시연에서는 새로 조사하도록 체크
const forceBox = page.locator("label", { hasText: "최근 결과가 있어도" }).locator('[role="checkbox"]');
if ((await forceBox.count()) && (await forceBox.getAttribute("aria-checked")) !== "true") await clickOn(forceBox, { pause: 300 });
caption("research", 1);
const DRY = Boolean(process.env.DRY);
let finalStatus = "dry-run";
if (DRY) {
  mark("wait-start");
  mark("wait-end");
} else {
await clickOn(page.getByRole("button", { name: /실제 AI 리서치 시작/ }));
await sleep(900);
await clickOn(page.getByRole("button", { name: "확인하고 실행" }));
await page.getByText(/상태:/).waitFor();
caption("research", 2);
await sleep(5000);
mark("wait-start");
const waitStart = now();
let midShot = false;
while (true) {
  const status = (await page.locator('[role="status"]').first().innerText().catch(() => "")) ?? "";
  if (/상태: (완료|실패|중단됨|시간 초과|연결 끊김)/.test(status)) break;
  if (now() - waitStart > 280) break;
  if (!midShot && now() - waitStart > 60) {
    await shot("04_research_progress");
    midShot = true;
  }
  await moveTo(700 + Math.random() * 500, 520 + Math.random() * 200);
  await sleep(2500);
}
mark("wait-end");
finalStatus = await page.locator('[role="status"]').first().innerText();
mark("research-status", { status: finalStatus });
await scrollTo(0, 800);
await sleep(2500);
await shot("04_research_done");
}

// ── 5. 결과 & 출처 ──
scene("results");
caption("results", 0);
if (DRY) await go(BASE + "/report");
else await clickOn(page.getByRole("link", { name: /보고서 보기/ }).first());
await page.waitForURL("**/report");
await sleep(2200);
await shot("05_report_top");
await scrollTo(520, 2600);
caption("results", 1);
const recHeading = page.locator('h2[id^="rec-"]').first();
if (await recHeading.count()) {
  await recHeading.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy({ top: -120 }));
}
await sleep(3200);
await shot("05_report_cards");
caption("results", 2);
await page.locator("#sources").scrollIntoViewIfNeeded();
await sleep(1200);
const firstSrc = page.locator("#sources a").first();
if (await firstSrc.count()) {
  const b = await firstSrc.boundingBox();
  if (b) {
    await page.evaluate(([x, y, w, h]) => window.__hl?.(x, y, w, h), [b.x, b.y, b.width, b.height]);
    await moveTo(b.x + b.width / 2, b.y + b.height / 2);
  }
}
await sleep(2600);
await shot("05_report_sources");

// ── 6. 전략 비교 ──
scene("strategy");
caption("strategy", 0);
await go(BASE + "/strategy");
await page.getByRole("button", { name: /실행 계획 만들기/ }).first().waitFor();
await sleep(2600);
await shot("06_strategy");
caption("strategy", 1);
await page.locator("#compare-title").scrollIntoViewIfNeeded();
await sleep(3000);
await shot("06_strategy_compare");
caption("strategy", 2);
await scrollTo(0, 900);
await clickOn(page.getByRole("button", { name: /실행 계획 만들기/ }).first(), { pause: 700 });
await page.waitForURL("**/roadmap");

// ── 7. 로드맵 ──
scene("roadmap");
caption("roadmap", 0);
await sleep(2600);
await shot("07_roadmap");
caption("roadmap", 1);
const link = page.locator('ul[aria-label="관련 공식 사이트"] a').first();
if (await link.count()) {
  await link.scrollIntoViewIfNeeded();
  const b = await link.boundingBox();
  if (b) {
    await page.evaluate(([x, y, w, h]) => window.__hl?.(x, y, w, h), [b.x, b.y, b.width, b.height]);
    await moveTo(b.x + b.width / 2, b.y + b.height / 2);
  }
}
await sleep(2600);
caption("roadmap", 2);
await clickOn(page.getByRole("checkbox").first(), { pause: 400 });
await sleep(1200);
await scrollTo(0, 900);
await sleep(1400);
await shot("07_roadmap_progress");

// ── 8. AI 코치 ──
scene("coach");
caption("coach", 0);
await go(BASE + "/");
await sleep(1200);
await clickOn(page.getByRole("link", { name: "AI 생애전환 코치에게 질문하기" }), { pause: 800 });
await page.waitForURL("**/coach");
await sleep(1500);
caption("coach", 1);
const ex = page.getByRole("button", { name: "6개월 안에 재취업하려면 무엇부터 해야 할까?" });
if (await ex.count()) await clickOn(ex, { pause: 400 });
else {
  await page.getByLabel("질문 입력").fill("6개월 안에 재취업하려면 무엇부터 해야 할까?");
  await clickOn(page.getByRole("button", { name: /질문/ }));
}
await sleep(4200);
await shot("08_coach");

// ── 9. 기대효과 & 엔딩 ──
scene("impact");
caption("impact", 0);
await card(impactCard(), 4500);
caption("impact", 1);
await sleep(4000);
await shot("09_impact");
scene("ending");
caption("ending", 0);
await card(endingCard(), 5000);
await shot("10_ending");
mark("end");

await cdp.send("Page.stopScreencast");
await sleep(500);
fs.writeFileSync(path.join(OUT, "frames.json"), JSON.stringify(frames));
fs.writeFileSync(path.join(OUT, "markers.json"), JSON.stringify({ T0, markers }, null, 1));
await ctx.close();
await browser.close();
console.log(`frames=${frames.length} duration=${(now() - T0).toFixed(1)}s wait=${(markers.find((m) => m.type === "wait-end").t - markers.find((m) => m.type === "wait-start").t).toFixed(1)}s status=${JSON.stringify(finalStatus.split("\n")[0])}`);
