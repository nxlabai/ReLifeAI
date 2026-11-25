"use client";
import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

/**
 * 로그인 사용자의 관리자 여부 (profiles.role, RLS 로 본인 행만 조회).
 * 화면 표시용일 뿐이며 실제 권한 검증은 서버(/api/admin/stats)에서 다시 수행한다.
 */
export function useIsAdmin(userId: string | undefined): boolean {
  const [admin, setAdmin] = useState<{ id: string; value: boolean } | null>(null);
  useEffect(() => {
    const sb = getBrowserSupabase();
    if (!sb || !userId) return;
    let alive = true;
    sb.from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (alive) setAdmin({ id: userId, value: data?.role === "admin" });
      });
    return () => {
      alive = false;
    };
  }, [userId]);
  return Boolean(userId && admin?.id === userId && admin.value);
}
