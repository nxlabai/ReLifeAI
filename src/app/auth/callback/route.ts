import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

/** 매직링크 / OAuth 코드 교환 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/"; // 오픈 리다이렉트 방지
  const sb = await getServerSupabase();
  if (code && sb) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  // token_hash 방식 (다른 브라우저에서 메일 링크를 열어도 동작 – Supabase 메일 템플릿에서 사용 가능)
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  if (tokenHash && sb && (type === "magiclink" || type === "email" || type === "signup")) {
    const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: type === "magiclink" ? "magiclink" : "email" });
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=1", url.origin));
}
