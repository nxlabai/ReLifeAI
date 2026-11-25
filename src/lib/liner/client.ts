import "server-only";
import { errorFromHttp } from "./errors";
import type { ResearchError } from "./events";

export const LINER_DEEP_RESEARCH_URL = "https://platform.liner.com/api/v1/agents/deep-research";
export const LINER_CREDITS_URL = "https://platform.liner.com/api/v1/credits/balance";

/** 로컬 통합 테스트용 모의 서버 주소 (production 에서는 무시) */
const endpoint = () =>
  process.env.NODE_ENV !== "production" && process.env.LINER_MOCK_URL?.startsWith("http://127.0.0.1") ? process.env.LINER_MOCK_URL : LINER_DEEP_RESEARCH_URL;

export type LinerMessage = { role: "user" | "assistant"; content: string };

export type DeepResearchRequest = {
  messages: LinerMessage[];
  lang: "ko";
  stream: true;
  request_id: string;
};

export const isLinerConfigured = () => Boolean(process.env.LINER_API_KEY?.trim());

export function buildRequestBody(messages: LinerMessage[], requestId: string): DeepResearchRequest {
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    throw new Error("messages 배열의 마지막 메시지는 user 역할이어야 합니다.");
  }
  return { messages, lang: "ko", stream: true, request_id: requestId };
}

export type OpenStreamResult =
  | { ok: true; body: ReadableStream<Uint8Array> }
  | { ok: false; error: ResearchError };

/**
 * Liner Deep Research 스트림을 연다. API 키는 서버 환경변수에서만 읽고 로그에 남기지 않는다.
 * 연결 타임아웃(첫 바이트까지)은 connectTimeoutMs, 전체 중단은 signal 로 제어.
 */
export async function openDeepResearchStream(
  messages: LinerMessage[],
  requestId: string,
  opts: { signal?: AbortSignal; connectTimeoutMs?: number } = {},
): Promise<OpenStreamResult> {
  const key = process.env.LINER_API_KEY?.trim();
  if (!key) return { ok: false, error: { code: "NOT_CONFIGURED", message: "LINER_API_KEY 미설정", retryable: false } };

  const connect = new AbortController();
  const timer = setTimeout(() => connect.abort(), opts.connectTimeoutMs ?? 60_000);
  const onAbort = () => connect.abort();
  opts.signal?.addEventListener("abort", onAbort);
  try {
    const res = await fetch(endpoint(), {
      method: "POST",
      headers: { "x-api-key": key, "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(buildRequestBody(messages, requestId)),
      signal: connect.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok || !res.body) {
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        /* 본문 없음 */
      }
      return { ok: false, error: errorFromHttp(res.status, body, res.headers.get("retry-after")) };
    }
    return { ok: true, body: res.body };
  } catch (e) {
    clearTimeout(timer);
    if (opts.signal?.aborted) return { ok: false, error: { code: "ABORTED", message: "중단됨", retryable: true } };
    const name = (e as Error).name;
    if (name === "AbortError" || name === "TimeoutError") return { ok: false, error: { code: "TIMEOUT", message: "Liner API 연결 시간이 초과되었습니다.", retryable: true } };
    return { ok: false, error: { code: "NETWORK_ERROR", message: "Liner API에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.", retryable: true } };
  } finally {
    opts.signal?.removeEventListener("abort", onAbort);
  }
}

/** 크레딧 잔액 조회 (무료 엔드포인트, 응답 형식은 문서에 미정의 → 원본 일부만 반환) */
export async function fetchCreditBalance(): Promise<{ ok: boolean; status?: number; data?: unknown }> {
  const key = process.env.LINER_API_KEY?.trim();
  if (!key) return { ok: false };
  try {
    const res = await fetch(LINER_CREDITS_URL, { headers: { "x-api-key": key, Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, status: res.status, data: await res.json() };
  } catch {
    return { ok: false };
  }
}
