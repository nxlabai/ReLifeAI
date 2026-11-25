"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ShieldCheck, Play, Square, RotateCcw, FileText, AlertTriangle, CheckCircle2, Loader2, Circle, Globe, Info } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DemoBadge, PageContainer, PageHeader } from "@/components/common";
import { ReportMarkdown } from "@/components/report/report-markdown";
import { SourceList } from "@/components/report/source-list";
import { useAppData } from "@/lib/data/store";
import { useHealth } from "@/hooks/use-health";
import { useResearch, type ResearchOutcome } from "@/lib/liner/use-research";
import { buildStructuredProfile, findMissingFields } from "@/lib/assessment/profile";
import { buildDemoReport } from "@/lib/demo/demo-report";
import { describeError } from "@/lib/liner/errors";
import type { ResearchState } from "@/lib/liner/events";
import type { SavedReport } from "@/lib/types";
import { newId } from "@/lib/id";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  idle: "대기", connecting: "연결 중", running: "조사 중", completed: "완료", failed: "실패", aborted: "중단됨", timeout: "시간 초과", interrupted: "연결 끊김",
};

export function ResearchView() {
  const { data, user, saveConsent, addReport, upsertReportLocal, reloadFromServer, setActiveReport } = useAppData();
  const health = useHealth();
  const router = useRouter();
  const [agree, setAgree] = useState(data.consent?.externalAi ?? false);
  const [includeEconomy, setIncludeEconomy] = useState(data.consent?.includeEconomy ?? false);
  const [includeResume, setIncludeResume] = useState(data.consent?.includeResume ?? false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [force, setForce] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const consent = { externalAi: true as const, includeEconomy, includeResume };
  const preview = useMemo(() => buildStructuredProfile(data.assessment, consent), [data.assessment, includeEconomy, includeResume]); // eslint-disable-line react-hooks/exhaustive-deps
  const missing = findMissingFields(data.assessment).filter((m) => m.importance === "high");

  const onDone = async (o: ResearchOutcome) => {
    if (o.type === "cached") {
      await reloadFromServer();
      setNotice("최근 같은 조건으로 완료된 리서치 결과를 불러왔습니다. 추가 비용이 발생하지 않았습니다.");
      return;
    }
    if (o.type === "error") return;
    const s = o.state;
    if (!s.text.trim()) return;
    if (user && o.reportId) {
      await reloadFromServer();
      setActiveReport(o.reportId);
      setSavedId(o.reportId);
    } else {
      const r: SavedReport = {
        id: s.jobId ?? newId(), jobId: s.jobId, source: "liner", status: s.status, title: `인생 2막 맞춤 전략 보고서 (${new Date().toISOString().slice(0, 10)})`,
        markdown: s.text, references: s.references, tasks: s.tasks, createdAt: new Date().toISOString(),
      };
      upsertReportLocal(r);
      setSavedId(r.id);
    }
  };
  const { state, busy, start, stop } = useResearch(onDone);

  const run = async () => {
    setConfirmOpen(false);
    setNotice(null);
    setSavedId(null);
    await saveConsent({ externalAi: true, includeEconomy, includeResume, agreedAt: new Date().toISOString() });
    await start({ assessment: data.assessment, consent, force });
    setForce(false);
  };

  const showDemo = async () => {
    await addReport(buildDemoReport(data.assessment));
    router.push("/report");
  };

  const linerReady = health?.liner;
  const loginNeeded = health && !health.guestResearch && !user;
  const started = state.status !== "idle";

  return (
    <PageContainer>
      <PageHeader title="AI 맞춤 리서치" icon={Search} description="Liner Deep Research Agent가 공공기관·교육기관 등 신뢰할 수 있는 출처를 중심으로 최신 정보를 조사합니다." />

      {!started && (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <section className="space-y-5 rounded-2xl bg-white p-6 ring-1 ring-border" aria-labelledby="consent-title">
            <h2 id="consent-title" className="flex items-center gap-2 text-xl font-bold"><ShieldCheck className="size-6 text-primary" aria-hidden />외부 AI 전송 동의</h2>
            {missing.length > 0 && (
              <p className="rounded-xl bg-accent p-3 text-[0.95rem]">
                중요 항목({missing.map((m) => m.label).join(", ")})이 비어 있어요. 그대로 진행할 수 있지만 <Link href="/diagnosis" className="font-semibold underline">진단을 보완</Link>하면 더 정확해집니다.
              </p>
            )}
            <label className="flex items-start gap-3 rounded-xl border-2 p-4 has-[[data-checked]]:border-primary">
              <Checkbox checked={agree} onCheckedChange={(v) => setAgree(Boolean(v))} className="mt-1 size-5" aria-describedby="agree-desc" />
              <span>
                <span className="font-semibold">(필수) 아래 정보를 Liner API로 전송하는 데 동의합니다.</span>
                <span id="agree-desc" className="block text-sm text-muted-foreground">이름·연락처·이메일은 전송하지 않으며, 지역은 시·도 단위, 경제 정보는 범위로만 전송합니다. 연락처 등은 자동으로 지워집니다.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-xl border p-4">
              <Checkbox checked={includeEconomy} onCheckedChange={(v) => setIncludeEconomy(Boolean(v))} className="mt-1 size-5" />
              <span><span className="font-semibold">(선택) 경제 상황 범위 정보 포함</span><span className="block text-sm text-muted-foreground">희망 소득·생활비·교육 예산·준비 기간·연금 여부를 포함하면 경제 상황에 맞는 전략을 받을 수 있습니다.</span></span>
            </label>
            <label className="flex items-start gap-3 rounded-xl border p-4">
              <Checkbox checked={includeResume} onCheckedChange={(v) => setIncludeResume(Boolean(v))} className="mt-1 size-5" />
              <span><span className="font-semibold">(선택) 직접 입력한 경력 원문 포함</span><span className="block text-sm text-muted-foreground">최대 1,500자, 개인정보 마스킹 후 전송</span></span>
            </label>
            <details className="rounded-xl bg-muted p-4">
              <summary className="cursor-pointer font-semibold">전송될 정보 미리보기</summary>
              <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-all text-sm">{JSON.stringify(preview, null, 2)}</pre>
            </details>
          </section>

          <section className="space-y-4 rounded-2xl bg-white p-6 ring-1 ring-border" aria-labelledby="run-title">
            <h2 id="run-title" className="text-xl font-bold">리서치 실행</h2>
            <p className="flex gap-2 text-[0.95rem] text-muted-foreground"><Info className="mt-1 size-4 shrink-0" aria-hidden />Deep Research는 수 분이 걸릴 수 있으며 1회 실행마다 Liner API 사용료가 발생합니다. 같은 조건의 최근 결과가 있으면 비용 없이 불러옵니다.</p>
            {health && !linerReady && (
              <p role="status" className="rounded-xl bg-amber-50 p-3 text-[0.95rem] text-amber-900 ring-1 ring-amber-200">
                서버에 <code>LINER_API_KEY</code>가 설정되지 않아 실제 리서치를 실행할 수 없습니다. 아래 데모 결과로 기능을 체험할 수 있습니다.
              </p>
            )}
            {loginNeeded && (
              <p className="rounded-xl bg-amber-50 p-3 text-[0.95rem] text-amber-900 ring-1 ring-amber-200">
                실제 리서치는 <Link href="/login?next=/research" className="font-semibold underline">로그인</Link> 후 이용할 수 있습니다.
              </p>
            )}
            <Button size="lg" className="w-full" disabled={!agree || !linerReady || Boolean(loginNeeded) || busy} onClick={() => setConfirmOpen(true)}>
              <Play aria-hidden /> 실제 AI 리서치 시작
            </Button>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={force} onCheckedChange={(v) => setForce(Boolean(v))} /> 최근 결과가 있어도 최신 정보로 다시 조사 (추가 비용 발생)
            </label>
            <div className="border-t pt-4">
              <Button size="lg" variant="outline" className="w-full" onClick={showDemo}>
                <FileText aria-hidden /> 샘플 결과 보기 <DemoBadge className="ml-1" />
              </Button>
              <p className="mt-2 text-sm text-muted-foreground">샘플은 미리 만든 데모 데이터이며 실제 최신 검색 결과가 아닙니다. API 비용이 발생하지 않습니다.</p>
            </div>
          </section>
        </div>
      )}

      {started && (
        <ResearchProgress
          state={state}
          busy={busy}
          onStop={stop}
          onRetry={() => setConfirmOpen(true)}
          notice={notice}
          savedId={savedId}
          isGuest={!user}
        />
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>실제 AI 리서치를 실행할까요?</DialogTitle>
            <DialogDescription>
              Liner Deep Research API를 1회 호출하며 사용료가 발생합니다. 동의한 정보만 익명화되어 전송됩니다. 조사에는 수 분이 걸릴 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>취소</Button>
            <Button onClick={run}>확인하고 실행</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

function ResearchProgress({ state, busy, onStop, onRetry, notice, savedId, isGuest }: { state: ResearchState; busy: boolean; onStop: () => void; onRetry: () => void; notice: string | null; savedId: string | null; isGuest: boolean }) {
  const doneTasks = state.tasks.filter((t) => t.isComplete);
  const activeTasks = state.tasks.filter((t) => !t.isComplete);
  const failed = ["failed", "timeout", "interrupted", "aborted"].includes(state.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5 ring-1 ring-border">
        <div role="status" aria-live="polite" className="flex items-center gap-3">
          {busy ? <Loader2 className="size-6 animate-spin text-primary" aria-hidden /> : state.status === "completed" ? <CheckCircle2 className="size-6 text-emerald-700" aria-hidden /> : <AlertTriangle className="size-6 text-amber-700" aria-hidden />}
          <div>
            <p className="text-lg font-bold">상태: {STATUS_LABEL[state.status]}</p>
            <p className="text-sm text-muted-foreground">
              {state.tasks.length > 0 ? `조사 태스크 ${doneTasks.length}개 완료 / 전체 ${state.tasks.length}개` : "조사 계획 수신 대기 중"} · 출처 {state.references.length}개
              {state.reasoning && " · 분석 중"}
              {state.textStarted && !state.textDone && " · 보고서 작성 중"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {busy && <Button variant="destructive" onClick={onStop}><Square aria-hidden /> 조사 중단</Button>}
          {!busy && failed && <Button onClick={onRetry}><RotateCcw aria-hidden /> 다시 시도</Button>}
          {!busy && state.text && <Link href="/report" className={cn(buttonVariants())}><FileText aria-hidden /> 보고서 보기</Link>}
        </div>
      </div>

      {notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-900 ring-1 ring-emerald-200">{notice} <Link href="/report" className="font-semibold underline">보고서 보기</Link></p>}
      {state.error && (
        <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-900 ring-1 ring-red-200">
          <p className="font-semibold">{describeError(state.error)}</p>
          <p className="text-sm">오류 코드: {state.error.code}{state.error.httpStatus ? ` (HTTP ${state.error.httpStatus})` : ""}{state.error.retryable ? " · 다시 시도할 수 있습니다" : ""}</p>
          {state.text && <p className="mt-1 text-sm">받은 부분 보고서는 보존되며, 완료된 보고서로 표시되지 않습니다.</p>}
        </div>
      )}
      {busy && isGuest && <p className="text-sm text-muted-foreground">로그인하지 않은 상태에서는 이 화면을 벗어나면 진행 상황을 다시 볼 수 없습니다.</p>}
      {savedId && !busy && <p className="text-sm text-emerald-800">보고서가 {isGuest ? "이 기기에" : "내 계정에"} 저장되었습니다.</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6">
          <section className="rounded-2xl bg-white p-5 ring-1 ring-border" aria-labelledby="tasks-title">
            <h2 id="tasks-title" className="text-lg font-bold">조사 항목</h2>
            {state.tasks.length === 0 ? (
              <p className="mt-2 text-muted-foreground">Liner가 조사 계획을 보내면 여기에 표시됩니다.</p>
            ) : (
              <>
                <h3 className="mt-3 text-sm font-semibold text-muted-foreground">현재 조사 중 ({activeTasks.length})</h3>
                <ul className="mt-1 space-y-1.5">
                  {activeTasks.map((t) => (
                    <li key={t.taskId} className="flex gap-2"><Loader2 className={cn("mt-1 size-4 shrink-0 text-primary", busy && "animate-spin")} aria-hidden />{t.task}</li>
                  ))}
                </ul>
                <h3 className="mt-4 text-sm font-semibold text-muted-foreground">완료 ({doneTasks.length})</h3>
                <ul className="mt-1 space-y-1.5">
                  {doneTasks.map((t) => (
                    <li key={t.taskId} className="flex gap-2"><CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-700" aria-hidden />{t.task}</li>
                  ))}
                </ul>
              </>
            )}
            {state.steps.length > 0 && (
              <>
                <h3 className="mt-4 text-sm font-semibold text-muted-foreground">검색 단계</h3>
                <ul className="mt-1 max-h-48 space-y-1 overflow-y-auto text-sm">
                  {state.steps.map((s) => (
                    <li key={s.key} className="flex gap-2"><Circle className="mt-1.5 size-2.5 shrink-0 fill-current text-brand-teal" aria-hidden />{s.label}</li>
                  ))}
                </ul>
              </>
            )}
          </section>
          <section className="rounded-2xl bg-white p-5 ring-1 ring-border" aria-labelledby="src-title">
            <h2 id="src-title" className="flex items-center gap-2 text-lg font-bold"><Globe className="size-5 text-primary" aria-hidden />수집된 출처 ({state.references.length})</h2>
            <div className="mt-3 max-h-[28rem] overflow-y-auto pr-1">
              <SourceList references={state.references} compact />
            </div>
          </section>
        </div>
        <section className="rounded-2xl bg-white p-5 ring-1 ring-border" aria-labelledby="live-title">
          <h2 id="live-title" className="text-lg font-bold">리서치 보고서 {state.textStarted && !state.textDone ? "(실시간 작성 중)" : ""}</h2>
          {state.text ? (
            <div className="mt-3 max-h-[48rem] overflow-y-auto">
              <ReportMarkdown markdown={state.text} references={state.references} />
            </div>
          ) : (
            <p className="mt-2 text-muted-foreground">조사가 끝나면 보고서가 이곳에 실시간으로 작성됩니다.</p>
          )}
        </section>
      </div>
    </div>
  );
}
