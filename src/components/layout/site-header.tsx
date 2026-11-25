"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LogIn, Sprout } from "lucide-react";
import { NAV, PRIMARY_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { useAppData } from "@/lib/data/store";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-bold text-primary text-xl" aria-label="Re:Life AI 홈">
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground" aria-hidden>
        <Sprout className="size-5" />
      </span>
      <span>
        Re:Life <span className="text-brand-orange-strong">AI</span>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const { user } = useAppData();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  return (
    <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />
        <nav aria-label="주요 메뉴" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.filter((n) => PRIMARY_NAV.includes(n.href)).map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  aria-current={isActive(n.href) ? "page" : undefined}
                  className={cn("rounded-lg px-3 py-2 text-[0.95rem] font-medium hover:bg-secondary", isActive(n.href) && "bg-secondary text-primary")}
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Link href="/mypage" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}>마이페이지</Link>
          ) : (
            <Link href="/login" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "hidden sm:inline-flex")}>
              <LogIn aria-hidden /> 로그인
            </Link>
          )}
          <Sheet>
            <SheetTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }))} aria-label="전체 메뉴 열기">
              <Menu aria-hidden /> <span>전체 메뉴</span>
            </SheetTrigger>
            <SheetContent side="right" className="w-[88vw] max-w-sm overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="text-lg">전체 메뉴</SheetTitle>
              </SheetHeader>
              <nav aria-label="전체 메뉴" className="px-4 pb-6">
                <ul className="grid gap-1">
                  {NAV.map((n) => (
                    <li key={n.href}>
                      <SheetClose
                        render={
                          <Link
                            href={n.href}
                            aria-current={isActive(n.href) ? "page" : undefined}
                            className={cn("flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-secondary", isActive(n.href) && "bg-secondary text-primary")}
                          />
                        }
                      >
                        <n.icon className="size-5 text-primary" aria-hidden />
                        <span>
                          <span className="block font-semibold">{n.label}</span>
                          <span className="block text-sm text-muted-foreground">{n.description}</span>
                        </span>
                      </SheetClose>
                    </li>
                  ))}
                  <li className="mt-2 border-t pt-2">
                    <SheetClose render={<Link href={user ? "/mypage" : "/login"} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-secondary" />}>
                      <LogIn className="size-5 text-primary" aria-hidden /> {user ? "내 계정" : "로그인 / 회원가입"}
                    </SheetClose>
                  </li>
                </ul>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground space-y-2">
        <p className="font-semibold text-foreground">Re:Life AI · 당신의 경험을 새로운 가능성으로, 인생 2막을 설계하다</p>
        <p>AI 리서치 결과는 참고용입니다. 모집 기간·지원 자격·비용은 반드시 각 기관의 공식 안내를 확인하세요. 경제 정보 분석은 특정 금융상품 가입이나 투자를 권유하지 않습니다.</p>
        <p>AI 리서치는 Liner Deep Research Agent API를 사용합니다. 외부 전송 정보는 동의 후 익명화·최소화되어 전송됩니다.</p>
      </div>
    </footer>
  );
}
