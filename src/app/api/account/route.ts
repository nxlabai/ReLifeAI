import { getAdminSupabase, getCurrentUser } from "@/lib/supabase/server";


/** 회원 탈퇴: auth.users 삭제 → FK cascade 로 모든 개인 데이터 삭제 (api_usage_logs 는 user_id null 처리) */
export async function DELETE(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (body?.confirm !== "탈퇴합니다") return Response.json({ error: "확인 문구가 일치하지 않습니다" }, { status: 400 });
  const cur = await getCurrentUser();
  if (!cur) return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });
  const admin = getAdminSupabase();
  if (!admin) return Response.json({ error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않아 탈퇴를 처리할 수 없습니다" }, { status: 503 });
  const { error } = await admin.auth.admin.deleteUser(cur.user.id);
  if (error) return Response.json({ error: "탈퇴 처리 중 오류가 발생했습니다" }, { status: 500 });
  await cur.supabase.auth.signOut().catch(() => {});
  return Response.json({ ok: true });
}
