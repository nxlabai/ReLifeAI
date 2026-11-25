"use client";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

/** 메인 화면 플로팅 버튼 → AI 생애전환 코치 */
export function CoachFab() {
  return (
    <Link
      href="/coach"
      aria-label="AI 생애전환 코치에게 질문하기"
      className="fixed right-4 bottom-4 z-40 inline-flex min-h-14 items-center gap-2 rounded-full bg-brand-orange-strong px-5 py-3 text-base font-bold text-white shadow-lg ring-4 ring-white/70 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-3 focus-visible:outline-offset-2 sm:right-6 sm:bottom-6 print:hidden"
    >
      <MessageCircle className="size-6" aria-hidden />
      <span>
        AI 코치<span className="hidden sm:inline">에게 물어보기</span>
      </span>
    </Link>
  );
}
