// /api/research 통합 테스트 (모의 Liner 서버 사용). 사용: node scripts/test-research-api.mjs http://localhost:3000
const base = process.argv[2] ?? "http://localhost:3000";
const MOCK = "http://127.0.0.1:4010/__mode";
let failures = 0;
const check = (name, cond, extra = "") => {
  console.log(`${cond ? "PASS" : "FAIL"} ${name}${extra ? " – " + extra : ""}`);
  if (!cond) failures++;
};

const body = (q) => ({
  assessment: { basic: { ageBand: "50-54", region: "경남", currentJob: "생산관리 010-1234-5678" }, career: { industries: ["manufacturing"] }, goals: ["reemploy"], economy: { desiredIncome: "350-500" } },
  consent: { externalAi: true, includeEconomy: false, includeResume: false },
  confirmPaid: true,
  force: true,
  extraQuestion: q,
});

async function run(mode, q) {
  await fetch(MOCK, { method: "POST", body: mode });
  const res = await fetch(`${base}/api/research`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body(q)) });
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("event-stream")) return { status: res.status, json: await res.json() };
  const text = await res.text();
  const events = text.split(/\n\n/).filter((l) => l.startsWith("data: ")).map((l) => JSON.parse(l.slice(6)));
  return { status: res.status, events, raw: text };
}

// 1) 입력 검증
{
  const r = await fetch(`${base}/api/research`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ assessment: {}, consent: { externalAi: true } }) });
  check("유료 호출 확인 없으면 400", r.status === 400);
}
// 2) 정상 스트림
{
  const r = await run("ok", "q1");
  const types = r.events?.map((e) => e.type) ?? [];
  const end = r.events?.filter((e) => e.type === "relife-end").at(-1);
  check("정상: SSE 응답", r.status === 200, String(r.status));
  check("정상: relife-job 첫 이벤트", types[0] === "relife-job");
  check("정상: text-delta 중계", types.includes("text-delta"));
  check("정상: reasoning-delta 비공개", !r.raw.includes("SECRET_REASONING"));
  check("정상: 종료 상태 completed", end?.status === "completed", JSON.stringify(end));
  const text = r.events.filter((e) => e.type === "text-delta").map((e) => e.delta).join("");
  check("정상: 보고서 텍스트 복원", text.includes("모의 보고서입니다 ((1))") && text.includes("큐넷 확인 ((2))"));
}
// 3) 인증 오류
{
  const r = await run("auth", "q2");
  const err = r.events?.find((e) => e.type === "relife-error");
  check("401 → AUTH_ERROR", err?.error.code === "AUTH_ERROR", JSON.stringify(err?.error));
}
// 4) 크레딧 부족
{
  const r = await run("credits", "q3");
  const err = r.events?.find((e) => e.type === "relife-error");
  check("402 → INSUFFICIENT_CREDITS", err?.error.code === "INSUFFICIENT_CREDITS");
}
// 5) data-error
{
  const r = await run("data-error", "q4");
  const end = r.events?.filter((e) => e.type === "relife-end").at(-1);
  check("data-error → failed", end?.status === "failed", JSON.stringify(end));
}
// 6) 스트림 중단
{
  const r = await run("cut", "q5");
  const end = r.events?.filter((e) => e.type === "relife-end").at(-1);
  check("완료 신호 없이 끊김 → interrupted", end?.status === "interrupted", JSON.stringify(end));
}
await fetch(MOCK, { method: "POST", body: "ok" });
console.log(failures ? `\n${failures}개 실패` : "\n모두 통과");
process.exit(failures ? 1 : 0);
