import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";

/** 요청 사용자 세션으로 동작하는 클라이언트 (RLS 적용) */
export async function getServerSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;
  const store = await cookies();
  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* Server Component 에서는 쿠키 설정 불가 – proxy 가 세션 갱신 */
        }
      },
    },
  });
}

export async function getCurrentUser(): Promise<{ supabase: SupabaseClient; user: User } | null> {
  const supabase = await getServerSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ? { supabase, user: data.user } : null;
}

/** service role 클라이언트 – 관리자 집계, 회원 탈퇴 등 서버 전용 작업에만 사용 */
export function getAdminSupabase(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isSupabaseConfigured() || !key) return null;
  return createClient(publicEnv.supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** 관리자 권한 검증 (DB의 profiles.role 기준) */
export async function requireAdmin(): Promise<{ user: User } | null> {
  const cur = await getCurrentUser();
  if (!cur) return null;
  const { data } = await cur.supabase.from("profiles").select("role").eq("id", cur.user.id).single();
  return data?.role === "admin" ? { user: cur.user } : null;
}
