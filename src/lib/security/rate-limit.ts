/**
 * 인스턴스 메모리 기반 보조 레이트리미터 (Supabase 미설정/게스트용).
 * 로그인 사용자는 DB(research_jobs) 기준 일일 한도를 사용한다.
 * 서버리스 환경에서는 인스턴스별로 분리되므로 운영 시 Upstash Redis 등으로 교체 권장.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): { ok: boolean; remaining: number; resetAt: number } {
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    const nb = { count: 1, resetAt: now + windowMs };
    buckets.set(key, nb);
    if (buckets.size > 5000) for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    return { ok: true, remaining: limit - 1, resetAt: nb.resetAt };
  }
  if (b.count >= limit) return { ok: false, remaining: 0, resetAt: b.resetAt };
  b.count++;
  return { ok: true, remaining: limit - b.count, resetAt: b.resetAt };
}

export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || req.headers.get("x-real-ip") || "local";
}

export const DAY_MS = 24 * 60 * 60 * 1000;
