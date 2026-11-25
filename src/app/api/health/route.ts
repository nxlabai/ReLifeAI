import { connection } from "next/server";
import { isLinerConfigured } from "@/lib/liner/client";
import { isSupabaseConfigured } from "@/lib/env";


/** 설정 여부만 반환 (키 값은 절대 반환하지 않음) */
export async function GET() {
  await connection(); // 요청 시점 평가 (빌드 시 정적화 방지)
  return Response.json(
    {
      liner: isLinerConfigured(),
      supabase: isSupabaseConfigured(),
      serviceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      guestResearch: !isSupabaseConfigured() || process.env.ALLOW_GUEST_RESEARCH === "true",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
