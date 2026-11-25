"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ClipboardList, SkipForward, ShieldCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChoiceGroup, NativeSelect, PageContainer, PageHeader } from "@/components/common";
import { useAppData } from "@/lib/data/store";
import * as O from "@/lib/assessment/options";
import { assessmentSchema, type Assessment } from "@/lib/assessment/schema";
import { completeness, findMissingFields, summarizeProfile } from "@/lib/assessment/profile";
import { cn } from "@/lib/utils";

const STEPS = ["기본 정보", "경력 및 보유역량", "관심 분야 및 목표", "경제 상황 및 제약", "전략 방향"];

export function DiagnosisWizard() {
  const { ready, data } = useAppData();
  const params = useSearchParams();
  if (!ready) return null;
  const purpose = params.get("purpose");
  const s = Number(params.get("step"));
  const initial = { ...data.assessment };
  if (purpose && O.PURPOSES.some((p) => p.value === purpose)) initial.purpose = purpose as Assessment["purpose"];
  return <WizardInner initial={initial} initialStep={s >= 1 && s <= 5 ? s : 1} />;
}

function WizardInner({ initial, initialStep }: { initial: Assessment; initialStep: number }) {
  const { saveAssessment } = useAppData();
  const router = useRouter();
  const [a, setA] = useState<Assessment>(initial);
  const [step, setStep] = useState(initialStep);
  const [done, setDone] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step, done]);

  const set = <K extends keyof Assessment>(k: K, v: Assessment[K]) => setA((p) => ({ ...p, [k]: v }));
  const setIn = <K extends "basic" | "career" | "economy">(k: K, field: keyof Assessment[K], v: unknown) => setA((p) => ({ ...p, [k]: { ...p[k], [field]: v } }));

  const persist = async (next: Assessment) => {
    const parsed = assessmentSchema.safeParse(next);
    await saveAssessment(parsed.success ? parsed.data : next);
  };

  const go = async (n: number) => {
    await persist(a);
    if (n > STEPS.length) setDone(true);
    else setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (done) {
    const missing = findMissingFields(a);
    return (
      <PageContainer className="max-w-3xl">
        <PageHeader title="진단이 완료되었습니다" icon={Check} description="입력하신 정보는 AI 리서치에 사용할 구조화된 프로필로 정리되었습니다." />
        <h2 ref={headingRef} tabIndex={-1} className="sr-only">진단 결과 요약</h2>
        <div className="space-y-4 rounded-2xl bg-white p-6 ring-1 ring-border">
          <p className="text-lg font-semibold">{summarizeProfile(a)}</p>
          <p>입력 완성도 <strong className="text-primary">{completeness(a)}%</strong></p>
          {missing.length > 0 && (
            <div className="rounded-xl bg-accent p-4">
              <p className="flex items-center gap-2 font-semibold text-accent-foreground"><AlertCircle className="size-5" aria-hidden /> 입력하지 않은 항목이 있어요 (건너뛰어도 이용 가능)</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {missing.map((m) => (
                  <li key={m.key}>
                    <button type="button" onClick={() => { setDone(false); setStep(m.step); }} className="rounded-full bg-white px-3 py-1 text-sm ring-1 ring-border hover:ring-primary">
                      {m.label}{m.importance === "high" ? " (중요)" : ""}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-muted-foreground">중요 항목을 입력하면 더 정확한 리서치 결과를 받을 수 있습니다.</p>
            </div>
          )}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button size="lg" onClick={() => router.push("/research")}>AI 맞춤 리서치 시작 <ArrowRight aria-hidden /></Button>
          <Button size="lg" variant="outline" onClick={() => { setDone(false); setStep(1); }}>처음부터 수정</Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="max-w-3xl">
      <PageHeader title="나의 생애전환 진단" icon={ClipboardList} description="모든 항목은 선택 입력입니다. 모르는 항목은 건너뛰어도 괜찮아요." />

      <nav aria-label="진단 단계" className="mb-6">
        <ol className="grid grid-cols-5 gap-1.5">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => go(i + 1)}
                aria-current={step === i + 1 ? "step" : undefined}
                className={cn("w-full rounded-lg py-2 text-xs font-semibold sm:text-sm", step === i + 1 ? "bg-primary text-primary-foreground" : step > i + 1 ? "bg-secondary text-primary" : "bg-muted text-muted-foreground")}
              >
                <span className="block">STEP {i + 1}</span>
                <span className="hidden sm:block">{s}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <section className="space-y-7 rounded-2xl bg-white p-5 ring-1 ring-border sm:p-8" aria-labelledby="step-title">
        <h2 id="step-title" ref={headingRef} tabIndex={-1} className="text-xl font-bold outline-none">
          STEP {step}. {STEPS[step - 1]}
        </h2>

        {step === 1 && (
          <>
            <ChoiceGroup label="연령대" options={O.AGE_BANDS} value={a.basic.ageBand} onChange={(v) => setIn("basic", "ageBand", v)} columns={3} />
            <div className="grid gap-5 sm:grid-cols-2">
              <NativeSelect id="region" label="거주 지역 (시·도)" options={O.REGIONS} value={a.basic.region} onChange={(v) => setIn("basic", "region", v)} />
              <NativeSelect id="edu" label="최종 학력" options={O.EDUCATION} value={a.basic.education} onChange={(v) => setIn("basic", "education", v)} />
            </div>
            <ChoiceGroup label="현재 고용 상태" options={O.EMPLOYMENT} value={a.basic.employment} onChange={(v) => setIn("basic", "employment", v)} columns={3} />
            <div className="space-y-2">
              <Label htmlFor="job">현재(또는 마지막) 직업 및 직무</Label>
              <Input id="job" maxLength={100} placeholder="예: 제조업 생산관리 부장" value={a.basic.currentJob ?? ""} onChange={(e) => setIn("basic", "currentJob", e.target.value)} />
              <p className="text-sm text-muted-foreground">회사명 등 개인을 특정할 수 있는 정보는 적지 않아도 됩니다.</p>
            </div>
            <ChoiceGroup label="퇴직 또는 이직 예정 시점" options={O.TRANSITION_TIMING} value={a.basic.transitionTiming} onChange={(v) => setIn("basic", "transitionTiming", v)} columns={3} />
          </>
        )}

        {step === 2 && (
          <>
            <ChoiceGroup label="주요 근무 산업" multiple options={O.INDUSTRIES} value={a.career.industries} onChange={(v) => setIn("career", "industries", v ?? [])} columns={3} />
            <ChoiceGroup label="총 경력 기간" options={O.CAREER_YEARS} value={a.career.careerYears} onChange={(v) => setIn("career", "careerYears", v)} />
            <div className="space-y-2">
              <Label htmlFor="duties">주요 수행 업무</Label>
              <Textarea id="duties" maxLength={1000} placeholder="예: 생산계획 수립, 품질관리, 협력사 관리" value={a.career.mainDuties ?? ""} onChange={(e) => setIn("career", "mainDuties", e.target.value)} />
            </div>
            <ChoiceGroup label="관리 및 리더십 경험" options={O.LEADERSHIP} value={a.career.leadership} onChange={(v) => setIn("career", "leadership", v)} />
            <div className="space-y-2">
              <Label htmlFor="skills">보유 기술</Label>
              <Input id="skills" maxLength={500} placeholder="예: 엑셀, 품질경영, 협상" value={a.career.skills ?? ""} onChange={(e) => setIn("career", "skills", e.target.value)} />
            </div>
            <ChoiceGroup label="디지털 활용 능력" options={O.DIGITAL} value={a.career.digital} onChange={(v) => setIn("career", "digital", v)} />
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="certs">보유 자격증</Label>
                <Input id="certs" maxLength={300} placeholder="예: 품질경영기사" value={a.career.certificates ?? ""} onChange={(e) => setIn("career", "certificates", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desired">희망하는 새로운 직무</Label>
                <Input id="desired" maxLength={200} placeholder="예: 품질 컨설턴트" value={a.career.desiredRole ?? ""} onChange={(e) => setIn("career", "desiredRole", e.target.value)} />
              </div>
            </div>
            <ResumeInput value={a.career.resumeText ?? ""} onChange={(v) => setIn("career", "resumeText", v)} />
          </>
        )}

        {step === 3 && (
          <ChoiceGroup label="관심 분야 및 미래 목표" multiple options={O.GOALS} value={a.goals} onChange={(v) => set("goals", (v as Assessment["goals"]) ?? [])} />
        )}

        {step === 4 && (
          <>
            <p className="flex gap-2 rounded-xl bg-secondary p-4 text-[0.95rem]">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              경제 정보는 모두 선택 입력이며 범위로만 받습니다. 계좌번호, 주민등록번호 등은 요구하지 않습니다. 외부 AI로 전송할지는 리서치 전에 별도로 동의받습니다.
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              <NativeSelect id="income" label="희망 월소득" options={O.INCOME_RANGES} value={a.economy.desiredIncome} onChange={(v) => setIn("economy", "desiredIncome", v)} />
              <NativeSelect id="living" label="월 생활비" options={O.LIVING_COST} value={a.economy.livingCost} onChange={(v) => setIn("economy", "livingCost", v)} />
              <NativeSelect id="edubudget" label="교육 투자 가능 금액" options={O.EDU_BUDGET} value={a.economy.eduBudget} onChange={(v) => setIn("economy", "eduBudget", v)} />
              <NativeSelect id="prep" label="소득 없이 준비할 수 있는 기간" options={O.PREP_PERIOD} value={a.economy.prepPeriod} onChange={(v) => setIn("economy", "prepPeriod", v)} />
              <NativeSelect id="pension" label="예상 연금 수령 여부" options={O.PENSION} value={a.economy.pension} onChange={(v) => setIn("economy", "pension", v)} />
              <NativeSelect id="hours" label="근무 가능 시간" options={O.WORK_HOURS} value={a.economy.workHours} onChange={(v) => setIn("economy", "workHours", v)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commute">출퇴근 가능 지역</Label>
              <Input id="commute" maxLength={100} placeholder="예: 창원·김해" value={a.economy.commuteArea ?? ""} onChange={(e) => setIn("economy", "commuteArea", e.target.value)} />
            </div>
            <ChoiceGroup
              label="온라인 교육 가능 여부"
              options={[{ value: "yes", label: "가능" }, { value: "no", label: "어려움" }]}
              value={a.economy.onlineOk === undefined ? undefined : a.economy.onlineOk ? "yes" : "no"}
              onChange={(v) => setIn("economy", "onlineOk", v === undefined ? undefined : v === "yes")}
            />
            <ChoiceGroup label="경제적 안정성에 대한 중요도" options={O.IMPORTANCE} value={a.economy.stabilityImportance} onChange={(v) => setIn("economy", "stabilityImportance", v)} columns={3} />
          </>
        )}

        {step === 5 && (
          <ChoiceGroup label="어떤 방향을 우선으로 전략을 세울까요?" multiple options={O.PRIORITIES} value={a.priorities} onChange={(v) => set("priorities", (v as Assessment["priorities"]) ?? [])} hint="가장 중요한 1~2개를 선택하면 전략 추천 순서에 반영됩니다." />
        )}
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" size="lg" onClick={() => go(step - 1)} disabled={step === 1}>
          <ArrowLeft aria-hidden /> 이전
        </Button>
        <div className="flex flex-wrap gap-3">
          {step < 5 && (
            <Button variant="ghost" size="lg" onClick={() => go(step + 1)}>
              건너뛰기 <SkipForward aria-hidden />
            </Button>
          )}
          <Button size="lg" onClick={() => go(step + 1)}>
            {step === 5 ? "진단 완료" : "저장하고 다음"} <ArrowRight aria-hidden />
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}

/** 이력서: 텍스트 파일(.txt/.md)만 브라우저에서 읽어 텍스트로 붙여넣음 (서버 업로드 없음) */
function ResumeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <Label htmlFor="resume">이력서 업로드 또는 경력 직접 입력 (선택)</Label>
      <Textarea id="resume" maxLength={5000} placeholder="경력 사항을 자유롭게 적거나 텍스트 파일을 불러오세요." value={value} onChange={(e) => onChange(e.target.value)} className="min-h-36" />
      <div className="flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-xl border-2 border-dashed px-4 py-2 font-medium hover:border-primary">
          텍스트 파일 불러오기 (.txt, .md)
          <input
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              setErr(null);
              if (!f) return;
              if (f.size > 200_000) return setErr("200KB 이하의 텍스트 파일만 불러올 수 있습니다.");
              onChange((await f.text()).slice(0, 5000));
            }}
          />
        </label>
        <span className="text-sm text-muted-foreground">{value.length}/5000자</span>
      </div>
      {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
      <p className="text-sm text-muted-foreground">연락처·이메일·주민번호 등은 외부 전송 시 자동으로 지워지며, 이력 원문은 별도 동의 시에만 AI 리서치에 사용됩니다.</p>
    </div>
  );
}
