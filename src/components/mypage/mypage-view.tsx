"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Download, Trash2, LogOut, ShieldCheck, Bookmark, ClipboardList, BarChart3, ArrowRight } from "lucide-react";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageContainer, PageHeader } from "@/components/common";
import { useAppData } from "@/lib/data/store";
import { completeness, summarizeProfile } from "@/lib/assessment/profile";
import { cn } from "@/lib/utils";

export function MyPageView() {
  const { ready, user, data, clearAll, signOut } = useAppData();
  const router = useRouter();
  const [dialog, setDialog] = useState<"clear" | "withdraw" | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const isAdmin = useIsAdmin(user?.id);
  if (!ready) return null;

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `relife-ai-내데이터-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const withdraw = async () => {
    const res = await fetch("/api/account", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: confirmText }) });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      localStorage.clear();
      await signOut();
      router.push("/");
    } else setMsg(body.error ?? "탈퇴 처리에 실패했습니다.");
  };

  return (
    <PageContainer className="max-w-3xl">
      <PageHeader title="마이페이지" icon={User} description={user ? `로그인 계정: ${user.email ?? "이메일 미확인"}` : "게스트 모드 – 데이터는 이 기기 브라우저에만 저장됩니다."} />

      {isAdmin && (
        <section className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary p-5 ring-1 ring-primary/30" aria-labelledby="admin-h">
          <div>
            <h2 id="admin-h" className="flex items-center gap-2 text-lg font-bold text-primary"><BarChart3 className="size-5" aria-hidden />관리자 계정</h2>
            <p className="text-[0.95rem] text-muted-foreground">가입자·리서치·API 사용 현황과 잔여 크레딧을 확인할 수 있습니다.</p>
          </div>
          <Link href="/admin" className={cn(buttonVariants())}>관리자 페이지로 이동 <ArrowRight aria-hidden /></Link>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 ring-1 ring-border">
          <h2 className="flex items-center gap-2 text-lg font-bold"><ClipboardList className="size-5 text-primary" aria-hidden />나의 진단</h2>
          <p className="mt-2">{summarizeProfile(data.assessment)}</p>
          <p className="text-sm text-muted-foreground">완성도 {completeness(data.assessment)}%</p>
          <Link href="/diagnosis" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3")}>진단 수정</Link>
        </section>
        <section className="rounded-2xl bg-white p-5 ring-1 ring-border">
          <h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="size-5 text-primary" aria-hidden />외부 AI 전송 동의</h2>
          {data.consent ? (
            <ul className="mt-2 text-[0.95rem]">
              <li>동의일: {new Date(data.consent.agreedAt).toLocaleString("ko-KR")}</li>
              <li>경제 정보 포함: {data.consent.includeEconomy ? "예" : "아니요"}</li>
              <li>경력 원문 포함: {data.consent.includeResume ? "예" : "아니요"}</li>
            </ul>
          ) : <p className="mt-2 text-muted-foreground">아직 동의하지 않았습니다.</p>}
          <Link href="/research" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3")}>동의 범위 변경</Link>
        </section>
        <section className="rounded-2xl bg-white p-5 ring-1 ring-border">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Bookmark className="size-5 text-primary" aria-hidden />활동 요약</h2>
          <ul className="mt-2 text-[0.95rem]">
            <li>리서치 보고서 {data.reports.length}건</li>
            <li>스크랩 {data.bookmarks.length}건</li>
            <li>실행 항목 {data.plan?.tasks.length ?? 0}건</li>
            <li>코치 대화 {data.coach.length}건</li>
          </ul>
        </section>
        <section className="rounded-2xl bg-white p-5 ring-1 ring-border">
          <h2 className="text-lg font-bold">내 데이터 관리</h2>
          <div className="mt-3 grid gap-2">
            <Button variant="outline" onClick={exportData}><Download aria-hidden /> 내 데이터 내려받기 (JSON)</Button>
            <Button variant="outline" onClick={() => { setDialog("clear"); setConfirmText(""); }}><Trash2 aria-hidden /> 개인정보·진단 데이터 전체 삭제</Button>
            {user && <Button variant="ghost" onClick={signOut}><LogOut aria-hidden /> 로그아웃</Button>}
            {user && <Button variant="destructive" onClick={() => { setDialog("withdraw"); setConfirmText(""); }}>회원 탈퇴</Button>}
          </div>
        </section>
      </div>
      {msg && <p role="alert" className="mt-4 text-destructive">{msg}</p>}

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog === "withdraw" ? "회원 탈퇴" : "데이터 전체 삭제"}</DialogTitle>
            <DialogDescription>
              {dialog === "withdraw"
                ? "계정과 진단·보고서·실행 계획·대화 등 모든 개인 데이터가 영구 삭제되며 되돌릴 수 없습니다. 계속하려면 ‘탈퇴합니다’를 입력하세요."
                : `진단 결과, 보고서, 실행 계획, 스크랩, 코치 대화가 ${user ? "계정에서" : "이 기기에서"} 영구 삭제됩니다. 계속하려면 ‘삭제합니다’를 입력하세요.`}
            </DialogDescription>
          </DialogHeader>
          <Input aria-label="확인 문구" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>취소</Button>
            {dialog === "withdraw" ? (
              <Button variant="destructive" disabled={confirmText !== "탈퇴합니다"} onClick={withdraw}>영구 탈퇴</Button>
            ) : (
              <Button variant="destructive" disabled={confirmText !== "삭제합니다"} onClick={async () => { await clearAll(); setDialog(null); setMsg("모든 데이터가 삭제되었습니다."); }}>영구 삭제</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
