"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageCircle, Send, Search, Loader2, Square, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageContainer, PageHeader } from "@/components/common";
import { ReportMarkdown } from "@/components/report/report-markdown";
import { useAppData } from "@/lib/data/store";
import { useHealth } from "@/hooks/use-health";
import { answerLocally } from "@/lib/agents/coach-agent";
import { useResearch, type ResearchOutcome } from "@/lib/liner/use-research";
import { describeError } from "@/lib/liner/errors";
import { stripStructuredBlock } from "@/lib/report/structured";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "지금 경력으로 어떤 직업에 지원할 수 있을까?",
  "6개월 안에 재취업하려면 무엇부터 해야 할까?",
  "내가 거주하는 지역에서 무료로 받을 수 있는 교육은?",
  "현재 자격증 중 활용할 수 있는 역량은?",
  "은퇴 후 월 생활비를 준비하기 위해 무엇을 확인해야 할까?",
];

export function CoachView() {
  const { ready, data, activeReport, addCoachMessage, user, reloadFromServer } = useAppData();
  const health = useHealth();
  const [q, setQ] = useState("");
  const [pendingQ, setPendingQ] = useState<string | null>(null);
  const [confirmQ, setConfirmQ] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const onDone = async (o: ResearchOutcome) => {
    if (o.type === "error") {
      await addCoachMessage({ role: "coach", content: `추가 조사를 완료하지 못했습니다: ${describeError(o.error)}`, basis: "guide" });
    } else if (o.type === "stream") {
      if (o.state.text.trim()) {
        await addCoachMessage({ role: "coach", content: stripStructuredBlock(o.state.text), basis: "liner", references: o.state.references });
        if (user) await reloadFromServer();
      } else if (o.state.error) {
        await addCoachMessage({ role: "coach", content: `추가 조사가 중단되었습니다: ${describeError(o.state.error)}`, basis: "guide" });
      }
    }
    setPendingQ(null);
  };
  const { state, busy, start, stop } = useResearch(onDone);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [data.coach.length, state.text.length]);

  if (!ready) return null;

  const ask = async (question: string) => {
    const text = question.trim().slice(0, 500);
    if (!text) return;
    setQ("");
    await addCoachMessage({ role: "user", content: text });
    const ans = answerLocally(text, data.assessment, activeReport);
    await addCoachMessage({ role: "coach", content: ans.content, basis: ans.basis });
    if (ans.needsResearch) setPendingQ(text);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    ask(q);
  };

  const runResearch = async (question: string) => {
    setConfirmQ(null);
    const summary = activeReport ? stripStructuredBlock(activeReport.markdown).slice(0, 3000) : undefined;
    await start({
      assessment: data.assessment,
      consent: { externalAi: true, includeEconomy: data.consent?.includeEconomy ?? false, includeResume: data.consent?.includeResume ?? false },
      kind: "followup",
      extraQuestion: question,
      focus: "사용자의 추가 질문에 답하기 위한 최신 정보 조사. 보고서는 간결하게 작성.",
      priorSummary: activeReport?.source === "liner" ? summary : undefined,
    });
  };

  const canResearch = health?.liner && (health.guestResearch || user) && data.consent?.externalAi;

  return (
    <PageContainer className="max-w-4xl">
      <PageHeader title="AI 생애전환 코치" icon={MessageCircle} description="저장된 진단과 리서치 결과를 바탕으로 답변합니다. 최신 정보가 필요하면 확인 후에만 추가 조사를 실행합니다." />

      <p className="mb-4 flex gap-2 rounded-xl bg-secondary p-3 text-[0.95rem]">
        <Info className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        일반 대화는 비용이 발생하지 않습니다. ‘최신 정보로 추가 조사’는 Liner Deep Research를 1회 호출하며 사용료가 발생합니다.
      </p>

      <div className="space-y-4 rounded-2xl bg-white p-4 ring-1 ring-border sm:p-6" aria-live="polite" aria-label="코치 대화">
        {data.coach.length === 0 && (
          <div>
            <p className="font-semibold">이런 질문을 해보세요</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {EXAMPLES.map((e) => (
                <li key={e}><button type="button" onClick={() => ask(e)} className="rounded-full bg-muted px-4 py-2 text-left text-[0.95rem] hover:bg-secondary">{e}</button></li>
              ))}
            </ul>
          </div>
        )}
        {data.coach.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[92%] rounded-2xl px-4 py-3", m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>
              {m.role === "user" ? <p className="whitespace-pre-wrap">{m.content}</p> : <ReportMarkdown markdown={m.content} references={m.references ?? []} />}
              {m.role === "coach" && m.basis && (
                <p className="mt-2 text-xs text-muted-foreground">답변 근거: {m.basis === "report" ? "저장된 리서치 보고서" : m.basis === "liner" ? "Liner 추가 조사 (출처 링크 포함)" : m.basis === "profile" ? "나의 진단 정보" : "일반 안내"}</p>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="rounded-2xl bg-muted px-4 py-3">
            <p className="flex items-center gap-2 font-semibold"><Loader2 className="size-4 animate-spin" aria-hidden /> 최신 정보 조사 중 · 태스크 {state.tasks.filter((t) => t.isComplete).length}/{state.tasks.length} · 출처 {state.references.length}개</p>
            {state.text && <div className="mt-2 max-h-80 overflow-y-auto"><ReportMarkdown markdown={state.text} references={state.references} /></div>}
            <Button size="sm" variant="destructive" className="mt-2" onClick={stop}><Square aria-hidden /> 중단</Button>
          </div>
        )}
        {pendingQ && !busy && (
          <div className="rounded-2xl border-2 border-dashed border-primary/40 p-4">
            <p className="font-semibold">최신 정보로 추가 조사할까요?</p>
            <p className="text-sm text-muted-foreground">질문: “{pendingQ}”</p>
            {!canResearch && <p className="mt-1 text-sm text-amber-800">{!health?.liner ? "LINER_API_KEY가 설정되지 않아 추가 조사를 할 수 없습니다." : !data.consent?.externalAi ? "AI 맞춤 리서치 화면에서 외부 AI 전송 동의가 필요합니다." : "로그인이 필요합니다."}</p>}
            <div className="mt-3 flex gap-2">
              <Button size="sm" disabled={!canResearch} onClick={() => setConfirmQ(pendingQ)}><Search aria-hidden /> 최신 정보로 추가 조사</Button>
              <Button size="sm" variant="ghost" onClick={() => setPendingQ(null)}>괜찮아요</Button>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={onSubmit} className="mt-4 flex gap-2" aria-label="코치에게 질문하기">
        <label htmlFor="coach-q" className="sr-only">질문 입력</label>
        <Textarea id="coach-q" value={q} maxLength={500} onChange={(e) => setQ(e.target.value)} placeholder="궁금한 점을 입력하세요 (최대 500자)" className="min-h-14 flex-1" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); ask(q); } }} />
        <Button type="submit" size="lg" disabled={!q.trim()}><Send aria-hidden /> 질문</Button>
      </form>

      <Dialog open={!!confirmQ} onOpenChange={(o) => !o && setConfirmQ(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>추가 조사를 실행할까요?</DialogTitle>
            <DialogDescription>Liner Deep Research API를 1회 호출하며 사용료가 발생합니다. 동의하신 범위의 익명화된 프로필과 질문만 전송됩니다.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmQ(null)}>취소</Button>
            <Button onClick={() => confirmQ && runResearch(confirmQ)}>확인하고 조사</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
