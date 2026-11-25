// 녹화 프레임 → 원본 영상 + 편집 영상(API 대기 구간 배속 단축, 자막·배지 합성) + SRT + 내레이션 대본
// 사용: node edit.mjs [대기구간 목표 길이(초), 기본 12]
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import { SCENES } from "./scenario.mjs";

const OUT = path.resolve("output");
const RAW = path.join(OUT, "raw_recordings");
fs.mkdirSync(RAW, { recursive: true });
const TARGET_WAIT = Number(process.argv[2] ?? 12);
const frames = JSON.parse(fs.readFileSync(path.join(OUT, "frames.json"), "utf8"));
const { markers } = JSON.parse(fs.readFileSync(path.join(OUT, "markers.json"), "utf8"));
const at = (type) => markers.find((m) => m.type === type)?.t;
const T0 = at("start");
const TEND = at("end") + 0.6;
const WS = at("wait-start");
const WE = at("wait-end");
const K = Math.max(1, (WE - WS) / TARGET_WAIT);

// 실제 시각 → 편집 영상 시각
const warp = (t) => {
  const x = t - T0;
  const ws = WS - T0;
  const we = WE - T0;
  if (x <= ws) return x;
  if (x <= we) return ws + (x - ws) / K;
  return ws + (we - ws) / K + (x - we);
};

function concatList(file, mapper) {
  const fs0 = frames.filter((f) => f.t >= T0 - 0.5 && f.t <= TEND);
  const lines = ["ffconcat version 1.0"];
  for (let i = 0; i < fs0.length; i++) {
    const a = mapper(Math.max(fs0[i].t, T0));
    const b = mapper(i + 1 < fs0.length ? fs0[i + 1].t : TEND);
    const d = Math.max(0.001, b - a);
    lines.push(`file 'frames/${fs0[i].file}'`, `duration ${d.toFixed(4)}`);
  }
  lines.push(`file 'frames/${fs0[fs0.length - 1].file}'`);
  fs.writeFileSync(path.join(OUT, file), lines.join("\n"));
}

const ff = (args) => execFileSync(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-y", ...args], { cwd: OUT, stdio: "inherit" });
const fmt = (s) => {
  const ms = Math.round(s * 1000);
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), sec = Math.floor((ms % 60000) / 1000), r = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(r).padStart(3, "0")}`;
};
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// ── 자막 (편집 영상 기준) ──
const realWait = WE - WS;
const cues = [];
const caps = markers.filter((m) => m.type === "caption");
for (let i = 0; i < caps.length; i++) cues.push({ start: warp(caps[i].t), text: caps[i].text });
cues.push({ start: warp(WS), text: `⏩ 시간 단축 편집 — 실제 API 응답 대기 약 ${mmss(realWait)}를 ${TARGET_WAIT}초로 줄였습니다 (약 ${K.toFixed(0)}배속)` });
cues.push({ start: warp(WE), text: "리서치 완료 — 보고서와 출처가 내 계정에 저장됩니다" });
cues.sort((a, b) => a.start - b.start);
const total = warp(TEND);
const srt = cues
  .map((c, i) => {
    const end = Math.min(i + 1 < cues.length ? cues[i + 1].start : total, c.start + 12) - 0.05;
    return `${i + 1}\n${fmt(c.start)} --> ${fmt(Math.max(c.start + 0.5, end))}\n${c.text}\n`;
  })
  .join("\n");
fs.writeFileSync(path.join(OUT, "subtitles.srt"), srt, "utf8");

// ── 내레이션 대본 ──
const scenes = markers.filter((m) => m.type === "scene");
let script = `Re:Life AI 해커톤 데모 영상 내레이션 대본\n영상 길이: ${mmss(total)} (1920×1080, 자막 포함)\n실제 Liner API 대기 ${mmss(realWait)} → ${TARGET_WAIT}초로 단축 편집\n\n`;
scenes.forEach((s, i) => {
  const st = warp(s.t);
  const en = i + 1 < scenes.length ? warp(scenes[i + 1].t) : total;
  script += `[${mmss(st)} ~ ${mmss(en)}] ${SCENES[s.scene].title}\n${SCENES[s.scene].narration}\n\n`;
});
fs.writeFileSync(path.join(OUT, "narration_script.txt"), script, "utf8");

// ── 원본 영상 (편집 전) ──
concatList("raw.txt", (t) => t - T0);
ff(["-f", "concat", "-safe", "0", "-i", "raw.txt", "-vf", "fps=30,scale=1920:1080,format=yuv420p", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-movflags", "+faststart", path.join("raw_recordings", "raw_full_recording.mp4")]);

// ── 편집 영상 ──
concatList("edit.txt", warp);
const ws = warp(WS).toFixed(2);
const we = warp(WE).toFixed(2);
const font = "C\\:/Windows/Fonts/malgunbd.ttf";
const badge = `drawtext=fontfile='${font}':text='▶▶ 시간 단축 편집 구간 (약 ${K.toFixed(0)}배속)':fontsize=40:fontcolor=white:box=1:boxcolor=0xE8701F@0.92:boxborderw=18:x=w-tw-48:y=40:enable='between(t,${ws},${we})'`;
const subs = `subtitles=subtitles.srt:force_style='FontName=Malgun Gothic,FontSize=13,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H28383F1E,BackColour=&H28383F1E,BorderStyle=3,Outline=12,Shadow=0,MarginV=34'`;
ff(["-f", "concat", "-safe", "0", "-i", "edit.txt", "-vf", `fps=30,scale=1920:1080,${badge},${subs},format=yuv420p`, "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-movflags", "+faststart", "demo_video.mp4"]);

console.log(JSON.stringify({ total: total.toFixed(1), realWait: realWait.toFixed(1), speed: K.toFixed(1), cues: cues.length }));
