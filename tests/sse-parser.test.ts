import { describe, expect, it } from "vitest";
import { SSEParser, interpretEvent, parseSSEStream } from "@/lib/liner/sse-parser";

const enc = new TextEncoder();

function streamOf(parts: (string | Uint8Array)[]) {
  return new ReadableStream<Uint8Array>({
    start(c) {
      for (const p of parts) c.enqueue(typeof p === "string" ? enc.encode(p) : p);
      c.close();
    },
  });
}

async function collect(parts: (string | Uint8Array)[]) {
  const out = [];
  for await (const e of parseSSEStream(streamOf(parts))) out.push(e);
  return out;
}

describe("SSEParser", () => {
  it("한 청크에 여러 이벤트", () => {
    const p = new SSEParser();
    const evs = p.push('event: data\ndata: {"type":"start"}\n\nevent: data\ndata: {"type":"start-step"}\n\n');
    expect(evs.map((e) => JSON.parse(e.data).type)).toEqual(["start", "start-step"]);
    expect(evs[0].event).toBe("data");
  });

  it("JSON 문자열이 청크 중간에서 분리", () => {
    const p = new SSEParser();
    expect(p.push('event: data\ndata: {"type":"text-de')).toEqual([]);
    expect(p.push('lta","id":"text-1","delta":"안녕')).toEqual([]);
    const evs = p.push('하세요"}\n\n');
    expect(JSON.parse(evs[0].data).delta).toBe("안녕하세요");
  });

  it("CRLF 가 청크 경계에서 분리", () => {
    const p = new SSEParser();
    const a = p.push('data: {"a":1}\r');
    const b = p.push("\n\r\n");
    expect([...a, ...b].length).toBe(1);
  });

  it("주석/keep-alive 무시, 멀티라인 data 병합", () => {
    const p = new SSEParser();
    const evs = p.push(': ping\n\ndata: {"x":\ndata: 1}\n\n');
    expect(evs).toHaveLength(1);
    expect(JSON.parse(evs[0].data)).toEqual({ x: 1 });
  });

  it("[DONE] 처리 및 잘못된 JSON 은 invalid", () => {
    expect(interpretEvent({ event: "message", data: "[DONE]" })).toEqual({ kind: "done" });
    expect(interpretEvent({ event: "data", data: "{oops" }).kind).toBe("invalid");
  });

  it("마지막 빈 줄 없이 종료돼도 flush", () => {
    const p = new SSEParser();
    p.push('data: {"type":"finish"}');
    expect(p.flush()).toHaveLength(1);
  });
});

describe("parseSSEStream", () => {
  it("UTF-8 멀티바이트 문자가 바이트 단위로 분리돼도 복원", async () => {
    const bytes = enc.encode('event: data\ndata: {"type":"text-delta","delta":"중장년"}\n\ndata: [DONE]\n\n');
    const parts: Uint8Array[] = [];
    for (let i = 0; i < bytes.length; i += 7) parts.push(bytes.slice(i, i + 7));
    const out = await collect(parts);
    expect(out[0]).toMatchObject({ kind: "json", payload: { delta: "중장년" } });
    expect(out[1]).toEqual({ kind: "done" });
  });
});
