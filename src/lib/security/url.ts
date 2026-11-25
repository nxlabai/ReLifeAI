/** 외부 출처 링크 안전성 검증: http(s)만 허용, 자격증명 포함/사설망/로컬 주소 차단 */
export function isSafeExternalUrl(raw: string): boolean {
  if (typeof raw !== "string" || raw.length > 2000) return false;
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return false;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  if (u.username || u.password) return false;
  const host = u.hostname.toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return false;
  if (/^\d+$/.test(host)) return false; // 정수형 IP 표기
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
  if (host.startsWith("[")) return false; // IPv6 리터럴 차단
  return true;
}

export function hostnameOf(raw: string): string {
  try {
    return new URL(raw).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** 공공·공식 출처 판별 (신뢰도 배지 표시용) */
const OFFICIAL_SUFFIXES = [".go.kr", ".or.kr", ".ac.kr", ".re.kr", "work24.go.kr", "kmooc.kr", "q-net.or.kr", "nps.or.kr", "fss.or.kr", "k-startup.go.kr"];
export function isOfficialSource(raw: string): boolean {
  const h = hostnameOf(raw);
  return OFFICIAL_SUFFIXES.some((s) => h === s.replace(/^\./, "") || h.endsWith(s));
}
