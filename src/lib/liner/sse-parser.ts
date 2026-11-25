/**
 * 증분 SSE 파서 (WHATWG EventSource 규격 기반).
 * - 네트워크 청크가 줄/JSON 중간에서 잘리는 경우 버퍼링
 * - 한 청크에 여러 이벤트가 들어오는 경우 모두 방출
 * - \n, \r\n, \r 줄바꿈 모두 지원, 멀티라인 data 필드 병합
 * - 주석(:) 라인 무시, data: [DONE] 종료 신호 처리
 */

export type RawSSEEvent = { event: string; data: string; id?: string };

export type ParsedSSE =
  | { kind: "json"; event: string; payload: unknown }
  | { kind: "done" }
  | { kind: "invalid"; event: string; raw: string; error: string };

export class SSEParser {
  private buffer = "";
  private dataLines: string[] = [];
  private eventName = "";
  private lastId: string | undefined;
  private sawCR = false;

  /** 청크(문자열)를 넣으면 완성된 이벤트 배열을 반환 */
  push(chunk: string): RawSSEEvent[] {
    let text = chunk;
    // 이전 청크가 \r 로 끝났고 이번 청크가 \n 으로 시작하면 CRLF 쌍이므로 \n 제거
    if (this.sawCR && text.startsWith("\n")) text = text.slice(1);
    this.sawCR = text.endsWith("\r");
    this.buffer += text;

    const events: RawSSEEvent[] = [];
    let start = 0;
    for (let i = 0; i < this.buffer.length; i++) {
      const c = this.buffer[i];
      if (c === "\n" || c === "\r") {
        const line = this.buffer.slice(start, i);
        if (c === "\r" && this.buffer[i + 1] === "\n") i++;
        start = i + 1;
        const ev = this.processLine(line);
        if (ev) events.push(ev);
      }
    }
    this.buffer = this.buffer.slice(start);
    return events;
  }

  /** 스트림 종료 시 남은 데이터를 방출 (마지막 빈 줄이 누락된 경우 대비) */
  flush(): RawSSEEvent[] {
    const out: RawSSEEvent[] = [];
    if (this.buffer.length) {
      const ev = this.processLine(this.buffer);
      if (ev) out.push(ev);
      this.buffer = "";
    }
    const ev = this.dispatch();
    if (ev) out.push(ev);
    return out;
  }

  private processLine(line: string): RawSSEEvent | null {
    if (line === "") return this.dispatch();
    if (line.startsWith(":")) return null; // comment / keep-alive
    const idx = line.indexOf(":");
    const field = idx === -1 ? line : line.slice(0, idx);
    let value = idx === -1 ? "" : line.slice(idx + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    switch (field) {
      case "data":
        this.dataLines.push(value);
        break;
      case "event":
        this.eventName = value;
        break;
      case "id":
        if (!value.includes("\0")) this.lastId = value;
        break;
      default:
        break; // retry 등은 무시
    }
    return null;
  }

  private dispatch(): RawSSEEvent | null {
    if (this.dataLines.length === 0) {
      this.eventName = "";
      return null;
    }
    const ev: RawSSEEvent = { event: this.eventName || "message", data: this.dataLines.join("\n"), id: this.lastId };
    this.dataLines = [];
    this.eventName = "";
    return ev;
  }
}

/** 원시 SSE 이벤트의 data를 JSON으로 해석 */
export function interpretEvent(ev: RawSSEEvent): ParsedSSE {
  const raw = ev.data.trim();
  if (raw === "[DONE]") return { kind: "done" };
  try {
    return { kind: "json", event: ev.event, payload: JSON.parse(raw) };
  } catch (e) {
    return { kind: "invalid", event: ev.event, raw: raw.slice(0, 500), error: (e as Error).message };
  }
}

/** ReadableStream<Uint8Array> → ParsedSSE 비동기 이터레이터 (UTF-8 멀티바이트 분할도 처리) */
export async function* parseSSEStream(stream: ReadableStream<Uint8Array>, signal?: AbortSignal): AsyncGenerator<ParsedSSE> {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  const parser = new SSEParser();
  try {
    while (true) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const { value, done } = await reader.read();
      if (done) break;
      for (const ev of parser.push(decoder.decode(value, { stream: true }))) yield interpretEvent(ev);
    }
    const tail = decoder.decode();
    for (const ev of [...parser.push(tail), ...parser.flush()]) yield interpretEvent(ev);
  } finally {
    reader.releaseLock();
  }
}
