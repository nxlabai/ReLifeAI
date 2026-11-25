"use client";
import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageContainer, PageHeader } from "@/components/common";
import { getBrowserSupabase } from "@/lib/supabase/client";

export function LoginForm() {
  const sb = getBrowserSupabase();
  const params = useSearchParams();
  const next = params.get("next")?.startsWith("/") && !params.get("next")?.startsWith("//") ? params.get("next")! : "/";
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!sb) return;
    setState("sending");
    const { error } = await sb.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
    if (error) {
      setState("error");
      const limited = error.status === 429 || /rate|security purposes|seconds/i.test(error.message);
      setMsg(limited ? "메일 발송 횟수 제한에 걸렸습니다. 1분 뒤 다시 시도해 주세요. 계속 실패하면 Supabase 기본 메일 서버의 시간당 발송 한도 때문이니 잠시 후 시도하거나 SMTP를 설정해 주세요." : "로그인 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } else setState("sent");
  };

  return (
    <PageContainer className="max-w-lg">
      <PageHeader title="로그인 / 회원가입" icon={LogIn} description="이메일로 받은 로그인 링크를 누르면 바로 시작할 수 있어요. 비밀번호가 필요 없습니다." />
      {!sb ? (
        <div className="rounded-2xl bg-amber-50 p-5 text-amber-900 ring-1 ring-amber-200">
          <p className="font-semibold">Supabase가 설정되지 않아 로그인 기능을 사용할 수 없습니다.</p>
          <p className="mt-1 text-[0.95rem]">지금은 게스트 모드로 이 기기에만 저장됩니다. 관리자는 <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>를 설정해 주세요.</p>
        </div>
      ) : state === "sent" ? (
        <div role="status" className="rounded-2xl bg-emerald-50 p-5 text-emerald-900 ring-1 ring-emerald-200">
          <p className="flex items-center gap-2 font-semibold"><Mail className="size-5" aria-hidden />로그인 링크를 보냈습니다.</p>
          <p className="mt-1">{email} 메일함을 확인해 주세요. 메일이 보이지 않으면 스팸함도 확인해 주세요.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-6 ring-1 ring-border">
          <div className="space-y-2">
            <Label htmlFor="email">이메일 주소</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
          </div>
          {state === "error" && <p role="alert" className="text-destructive">{msg}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={state === "sending"}>{state === "sending" ? "보내는 중…" : "로그인 링크 받기"}</Button>
          <p className="text-sm text-muted-foreground">로그인 시 이메일 주소는 계정 식별에만 사용되며, AI 리서치에 전송되지 않습니다. 게스트로 저장한 기기 내 데이터는 로그인 계정으로 자동 이전되지 않습니다.</p>
        </form>
      )}
    </PageContainer>
  );
}
