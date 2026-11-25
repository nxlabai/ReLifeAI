"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Briefcase, Repeat, GraduationCap, PiggyBank, Rocket, HelpCircle, ClipboardList, Search, Compass, ListChecks, MessageCircle, CheckCircle2, Circle, Users, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants, Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppData } from "@/lib/data/store";
import { completeness, summarizeProfile } from "@/lib/assessment/profile";
import { progressOf } from "@/lib/agents/roadmap-agent";
import { parseStructuredBlock } from "@/lib/report/structured";
import { PERSONAS } from "@/lib/demo/personas";
import { buildDemoReport } from "@/lib/demo/demo-report";
import { DemoBadge, StatusPill } from "@/components/common";
import { recommendationHref } from "@/components/report/recommendation-card";
import { TASK_CATEGORY_LABEL } from "@/lib/types";

const PURPOSE_CARDS = [
  { value: "reemploy", title: "재취업 준비", desc: "내 경력으로 지원할 수 있는 일자리와 지원사업", icon: Briefcase },
  { value: "transition", title: "경력 전환", desc: "새로운 직무로 옮기기 위한 교육과 경로", icon: Repeat },
  { value: "learning", title: "교육 및 역량 개발", desc: "직업훈련, 자격증, 평생교육 프로그램", icon: GraduationCap },
  { value: "retirement", title: "은퇴 및 노후 준비", desc: "연금·생활비 점검과 사회참여 활동", icon: PiggyBank },
  { value: "startup", title: "창업 및 프리랜서", desc: "경험을 살린 창업·자문·프리랜서 준비", icon: Rocket },
  { value: "unsure", title: "아직 잘 모르겠어요", desc: "진단부터 차근차근 방향을 찾아봐요", icon: HelpCircle },
];

export function HomeHero() {
  return (
    <section className="bg-gradient-to-br from-primary to-[oklch(0.5_0.09_195)] text-primary-foreground">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:py-20 md:grid-cols-[1.4fr_1fr] md:items-center">
        <div>
          <p className="mb-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">40대 이후 중장년을 위한 AI 생애전환 에이전트</p>
          <h1 className="text-3xl font-bold leading-tight sm:text-5xl">
            당신의 경험을 새로운 가능성으로,
            <br />
            <span className="text-[oklch(0.88_0.12_70)]">인생 2막</span>을 설계하다
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/90">
            흩어진 재취업·직업훈련·자격증·정부지원·노후 준비 정보를 AI가 대신 조사하고, 나에게 맞는 전략과 실행 로드맵까지 만들어 드립니다.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/diagnosis" className={cn(buttonVariants({ size: "lg", variant: "accent" }))}>
              나의 인생 2막 설계 시작하기 <ArrowRight aria-hidden />
            </Link>
            <a href="#demo" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "border-white/60 bg-transparent text-white hover:bg-white/10 hover:text-white")}>
              예시로 먼저 체험하기
            </a>
          </div>
        </div>
        <ol className="grid gap-3 rounded-3xl bg-white/10 p-5 text-base" aria-label="서비스 진행 단계">
          {["5단계 생애전환 진단", "AI 맞춤 리서치 (최신 공식 정보)", "전략 3가지 이상 비교·선택", "주·월·12개월 실행 로드맵", "AI 코치와 진행 관리·재설계"].map((s, i) => (
            <li key={s} className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white font-bold text-primary">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function PurposeCards() {
  return (
    <section aria-labelledby="purpose-title">
      <h2 id="purpose-title" className="text-2xl font-bold">무엇을 준비하고 계신가요?</h2>
      <p className="mt-1 text-muted-foreground">목적을 선택하면 맞춤 진단이 시작됩니다.</p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PURPOSE_CARDS.map((c) => (
          <li key={c.value}>
            <Link href={`/diagnosis?purpose=${c.value}`} className="group flex h-full items-start gap-4 rounded-2xl border-2 border-transparent bg-white p-5 shadow-sm ring-1 ring-border transition hover:border-primary hover:shadow-md">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary text-primary" aria-hidden>
                <c.icon className="size-6" />
              </span>
              <span>
                <span className="flex items-center gap-1 text-lg font-bold">
                  {c.title} <ArrowRight className="size-4 opacity-0 transition group-hover:opacity-100" aria-hidden />
                </span>
                <span className="mt-1 block text-muted-foreground">{c.desc}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HowItWorks() {
  const items = [
    { icon: ClipboardList, title: "진단", text: "경력·역량·목표·제약조건을 단계별로 입력", href: "/diagnosis" },
    { icon: Search, title: "AI 리서치", text: "Liner Deep Research로 공식 출처 중심 조사", href: "/research" },
    { icon: Compass, title: "전략 비교", text: "장단점·준비기간·비용·위험을 한눈에", href: "/strategy" },
    { icon: ListChecks, title: "실행 로드맵", text: "체크리스트로 실제 진행률 관리", href: "/roadmap" },
    { icon: MessageCircle, title: "AI 코치", text: "저장된 결과로 궁금한 점 바로 답변", href: "/coach" },
  ];
  return (
    <section aria-labelledby="how-title">
      <h2 id="how-title" className="text-2xl font-bold">AI Agent가 이렇게 도와드려요</h2>
      <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {items.map((it, i) => (
          <li key={it.title}>
            <Link href={it.href} className="block h-full rounded-2xl bg-white p-5 ring-1 ring-border hover:ring-primary">
              <span className="text-sm font-bold text-brand-orange-strong">STEP {i + 1}</span>
              <it.icon className="mt-2 size-7 text-primary" aria-hidden />
              <h3 className="mt-2 text-lg font-bold">{it.title}</h3>
              <p className="mt-1 text-[0.95rem] text-muted-foreground">{it.text}</p>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function HomeDashboard() {
  const { ready, data, user, activeReport } = useAppData();
  if (!ready) return null;
  const hasAssessment = Boolean(data.assessment.updatedAt);
  if (!hasAssessment && !data.reports.length && !data.plan) return null;
  const prog = progressOf(data.plan?.tasks ?? []);
  const nextTasks = (data.plan?.tasks ?? []).filter((t) => !t.done).sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999")).slice(0, 4);
  const parsed = activeReport ? parseStructuredBlock(activeReport.markdown) : null;
  const recs = parsed?.ok ? parsed.data.recommendations.slice(0, 3) : [];

  return (
    <section aria-labelledby="dash-title">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="dash-title" className="text-2xl font-bold">{user ? "나의 인생 2막 대시보드" : "이 기기에 저장된 나의 진행 상황"}</h2>
        {!user && <p className="text-sm text-muted-foreground">로그인하면 여러 기기에서 이어서 볼 수 있어요.</p>}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader><CardTitle>진단 결과</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-[0.95rem]">{summarizeProfile(data.assessment)}</p>
            <p className="text-sm text-muted-foreground">입력 완성도 {completeness(data.assessment)}%</p>
            <Link href="/diagnosis" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>진단 수정</Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>최근 리서치</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {activeReport ? (
              <>
                <p className="font-medium">{activeReport.title}</p>
                {activeReport.source === "demo" && <DemoBadge />}
                <Link href="/report" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>보고서 보기</Link>
              </>
            ) : (
              <Link href="/research" className={cn(buttonVariants({ size: "sm" }))}>AI 리서치 시작</Link>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>실행 계획 진행률</CardTitle></CardHeader>
          <CardContent>
            {data.plan ? (
              <>
                <p className="text-3xl font-bold text-primary">{prog.percent}%</p>
                <p className="text-sm text-muted-foreground">{prog.done} / {prog.total}개 완료 · {data.plan.strategyTitle ?? "직접 만든 계획"}</p>
                <div className="mt-2 h-3 rounded-full bg-muted" role="progressbar" aria-valuenow={prog.percent} aria-valuemin={0} aria-valuemax={100} aria-label="실행 진행률">
                  <div className="h-3 rounded-full bg-primary" style={{ width: `${prog.percent}%` }} />
                </div>
              </>
            ) : (
              <Link href="/strategy" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>전략 선택하기</Link>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>다음 할 일</CardTitle></CardHeader>
          <CardContent>
            {nextTasks.length ? (
              <ul className="space-y-2">
                {nextTasks.map((t) => (
                  <li key={t.id} className="flex gap-2 text-[0.95rem]">
                    <Circle className="mt-1 size-4 shrink-0 text-primary" aria-hidden />
                    <span>{t.title}<span className="block text-sm text-muted-foreground">{TASK_CATEGORY_LABEL[t.category]}{t.dueDate ? ` · ${t.dueDate}` : ""}</span></span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="size-4" aria-hidden />예정된 할 일이 없어요</p>
            )}
          </CardContent>
        </Card>
      </div>
      {recs.length > 0 && (
        <div className="mt-4 rounded-2xl bg-white p-5 ring-1 ring-border">
          <h3 className="font-bold">최근 추천 정보</h3>
          <ul className="mt-3 grid gap-3 md:grid-cols-3">
            {recs.map((r, i) => (
              <li key={i}>
                {(() => {
                  const { href, external } = recommendationHref(r);
                  const inner = (
                    <>
                      <p className="font-semibold text-primary underline-offset-4 group-hover:underline">
                        {r.title}
                        {external && <ExternalLink className="ml-1 inline size-4 align-[-2px]" aria-hidden />}
                      </p>
                      <p className="text-sm text-muted-foreground">{r.organization}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusPill status={r.status} />
                        <span className="text-xs text-muted-foreground">{external ? "공식 페이지 열기 (새 창)" : "관련 메뉴에서 보기"}</span>
                      </div>
                    </>
                  );
                  const cls = "group block h-full rounded-xl bg-muted p-3 ring-1 ring-transparent hover:ring-primary";
                  return external ? (
                    <a href={href} target="_blank" rel="noopener noreferrer nofollow" className={cls}>{inner}</a>
                  ) : (
                    <Link href={href} className={cls}>{inner}</Link>
                  );
                })()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export function DemoPersonas() {
  const { saveAssessment, addReport } = useAppData();
  const router = useRouter();
  const start = async (id: string, withReport: boolean) => {
    const p = PERSONAS.find((x) => x.id === id)!;
    await saveAssessment(p.assessment);
    if (withReport) {
      await addReport(buildDemoReport(p.assessment));
      router.push("/report");
    } else router.push("/diagnosis?step=5");
  };
  return (
    <section id="demo" aria-labelledby="demo-title" className="scroll-mt-20 rounded-3xl bg-accent/60 p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <Users className="size-7 text-accent-foreground" aria-hidden />
        <h2 id="demo-title" className="text-2xl font-bold">데모 모드: 예시 페르소나로 체험하기</h2>
        <DemoBadge />
      </div>
      <p className="mt-2 text-[0.95rem] text-muted-foreground">
        페르소나를 선택하면 진단 정보가 자동 입력됩니다. <strong>샘플 결과 보기</strong>는 비용 없이 미리 만든 데모 보고서를 보여주며 실제 최신 검색 결과가 아닙니다.
        실제 AI 리서치는 진단 후 ‘AI 맞춤 리서치’에서 동의 후 실행됩니다.
      </p>
      <ul className="mt-6 grid gap-4 md:grid-cols-3">
        {PERSONAS.map((p) => (
          <li key={p.id} className="flex flex-col rounded-2xl bg-white p-5 ring-1 ring-border">
            <p className="text-lg font-bold">{p.name}</p>
            <p className="font-medium text-primary">{p.headline}</p>
            <p className="mt-1 flex-1 text-[0.95rem] text-muted-foreground">{p.description}</p>
            <div className="mt-4 grid gap-2">
              <Button onClick={() => start(p.id, true)} variant="accent">샘플 결과 보기 (데모)</Button>
              <Button onClick={() => start(p.id, false)} variant="outline">진단 자동 입력 후 실제 리서치</Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
