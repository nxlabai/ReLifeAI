// 실제 Liner 호출 1회 점검 (유료). 이벤트 종류·형태 요약만 출력하고 키는 출력하지 않음.
// 사용: node scripts/real-research-probe.mjs http://localhost:3200 > probe.json
import fs from "node:fs";
const base = process.argv[2] ?? "http://localhost:3000";
const body = {
  assessment: {
    purpose: "reemploy",
    basic: { ageBand: "50-54", region: "경남", education: "bachelor", employment: "preretire", currentJob: "제조업 생산관리 부장", transitionTiming: "within1y" },
    career: { industries: ["manufacturing"], careerYears: "20-29", mainDuties: "생산계획, 품질관리, 협력사 관리", leadership: "dept", skills: "생산관리, 품질경영", digital: "intermediate", certificates: "품질경영기사", desiredRole: "품질 컨설턴트" },
    goals: ["reemploy", "freelance"],
    economy: { workHours: "fulltime", onlineOk: true },
    priorities: ["career", "income"],
  },
  consent: { externalAi: true, includeEconomy: false, includeResume: false },
  confirmPaid: true,
  force: true,
};
const t0 = Date.now();
const res = await fetch(`${base}/api/research`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
console.error("HTTP", res.status, res.headers.get("content-type"));
if (!res.headers.get("content-type")?.includes("event-stream")) { console.error(await res.text()); process.exit(1); }
const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
const raw = fs.createWriteStream("test-results/real-raw.jsonl"); const counts = {}; const samples = {}; let text = ""; let last = null;
while (true) {
  const { value, done } = await reader.read(); if (done) break;
  buf += dec.decode(value, { stream: true });
  let i; while ((i = buf.indexOf("\n\n")) >= 0) {
    const block = buf.slice(0, i); buf = buf.slice(i + 2);
    const line = block.split("\n").find((l) => l.startsWith("data: ")); if (!line) continue;
    let ev; try { ev = JSON.parse(line.slice(6)); } catch { continue; }
    counts[ev.type] = (counts[ev.type] ?? 0) + 1;
    if (ev.type !== "text-delta" && ev.type !== "reasoning-delta") raw.write(JSON.stringify(ev) + "\n");
    if (!samples[ev.type] || samples[ev.type].length < 2) (samples[ev.type] ??= []).push(JSON.stringify(ev).slice(0, 700));
    if (ev.type === "text-delta") text += ev.delta;
    if (ev.type === "relife-end" || ev.type === "relife-error") last = ev;
    if (counts[ev.type] === 1) console.error(`[${Math.round((Date.now() - t0) / 1000)}s] first ${ev.type}`);
  }
}
const out = { seconds: Math.round((Date.now() - t0) / 1000), counts, last, textLength: text.length, citations: [...new Set(text.match(/\(\([\d,\s]+\)\)|\[\d+\]/g) ?? [])].slice(0, 20), hasStructuredBlock: text.includes("```relife-data"), samples };
fs.writeFileSync("test-results/real-probe-report.md", text);
console.log(JSON.stringify(out, null, 2));
