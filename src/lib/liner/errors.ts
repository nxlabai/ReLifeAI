import type { ResearchError } from "./events";

/** HTTP 상태 → 사용자 안내용 오류 */
export function errorFromHttp(status: number, body: unknown, retryAfter?: string | null): ResearchError {
  const b = (body && typeof body === "object" ? (body as { error?: { code?: string; message?: string; retryable?: boolean } }).error : undefined) ?? {};
  const base = { httpStatus: status, retryable: Boolean(b.retryable) };
  switch (true) {
    case status === 401 || status === 403:
      return { ...base, code: "AUTH_ERROR", message: "Liner API 인증에 실패했습니다. 서버의 LINER_API_KEY 설정을 확인해 주세요.", retryable: false };
    case status === 402:
      return { ...base, code: "INSUFFICIENT_CREDITS", message: "Liner API 크레딧이 부족합니다. 플랫폼에서 크레딧을 충전한 뒤 다시 시도해 주세요.", retryable: false };
    case status === 429:
      return { ...base, code: "RATE_LIMITED", message: `요청이 많아 잠시 제한되었습니다.${retryAfter ? ` ${retryAfter}초 후` : " 잠시 후"} 다시 시도해 주세요.`, retryable: true };
    case status === 400 || status === 422:
      return { ...base, code: b.code ?? "BAD_REQUEST", message: "요청 형식이 올바르지 않습니다.", retryable: false };
    case status === 504 || status === 408:
      return { ...base, code: "TIMEOUT", message: "응답 시간이 초과되었습니다.", retryable: true };
    case status >= 500:
      return { ...base, code: b.code ?? "UPSTREAM_ERROR", message: "Liner 서비스에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요.", retryable: b.retryable ?? true };
    default:
      return { ...base, code: b.code ?? `HTTP_${status}`, message: b.message ? String(b.message).slice(0, 200) : `요청이 실패했습니다 (HTTP ${status}).` };
  }
}

/** data-error 코드 → 한국어 안내 */
export function describeError(err: ResearchError): string {
  const map: Record<string, string> = {
    DOWNSTREAM_ERROR: "외부 검색 서비스에 일시적인 문제가 발생했습니다.",
    NETWORK_INTERRUPTED: "네트워크 연결이 중단되었습니다. 저장된 부분 결과를 확인하거나 다시 시도해 주세요.",
    TIMEOUT: "리서치 시간이 서버 실행 제한을 초과했습니다. 받은 부분 결과는 저장되었습니다.",
    ABORTED: "사용자가 조사를 중단했습니다.",
    NOT_CONFIGURED: "LINER_API_KEY가 설정되지 않았습니다. 데모 결과로 체험하거나 관리자에게 문의해 주세요.",
  };
  return map[err.code] ?? err.message;
}
