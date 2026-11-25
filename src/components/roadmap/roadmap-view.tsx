"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ListChecks, Plus, Pencil, Trash2, ExternalLink, Save, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PageContainer, PageHeader } from "@/components/common";
import { useAppData } from "@/lib/data/store";
import { progressOf } from "@/lib/agents/roadmap-agent";
import { TASK_CATEGORY_LABEL, type ActionTask, type TaskCategory } from "@/lib/types";
import { newId } from "@/lib/id";
import { isSafeExternalUrl } from "@/lib/security/url";
import { findInstitutionLinks, labelForUrl } from "@/lib/institution-links";
import { cn } from "@/lib/utils";

/** 항목의 원래 링크 + 문장 속 기관명(중장년내일센터, 국민연금, 서울시50플러스 등) 공식 사이트 링크 */
export function TaskLinks({ title, sourceUrl }: { title: string; sourceUrl?: string }) {
  const own = sourceUrl && isSafeExternalUrl(sourceUrl) ? sourceUrl : undefined;
  const links = [...(own ? [{ label: labelForUrl(own), url: own }] : []), ...findInstitutionLinks(title, own)];
  if (!links.length) return null;
  return (
    <ul className="mt-1 flex flex-wrap gap-1.5" aria-label="관련 공식 사이트">
      {links.map((l) => (
        <li key={l.url}>
          <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex min-h-8 items-center gap-1 rounded-full bg-secondary px-3 text-sm font-medium text-primary hover:underline">
            {l.label} <ExternalLink className="size-3.5" aria-hidden />
            <span className="sr-only">(새 창)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

const ORDER: TaskCategory[] = ["week", "month1", "month3", "month6", "month12", "education", "certificate", "application", "resume", "retirement", "custom"];

export function RoadmapView() {
  const { ready, data, upsertTask, deleteTask } = useAppData();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TaskCategory>("week");
  const [due, setDue] = useState("");
  if (!ready) return null;

  const tasks = data.plan?.tasks ?? [];
  const prog = progressOf(tasks);
  const today = new Date().toISOString().slice(0, 10);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    await upsertTask({ id: newId(), title: t.slice(0, 200), category, dueDate: due || undefined, done: false, origin: "user", createdAt: new Date().toISOString() });
    setTitle("");
    setDue("");
  };

  return (
    <PageContainer>
      <PageHeader
        title="나의 실행 로드맵"
        icon={ListChecks}
        description={data.plan?.strategyTitle ? `선택한 전략: ${data.plan.strategyTitle}` : "전략을 선택하면 단계별 실행 항목이 자동으로 만들어집니다. 직접 추가할 수도 있어요."}
        actions={<Link href="/strategy" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>전략 다시 선택</Link>}
      />

      <section className="mb-8 rounded-2xl bg-white p-5 ring-1 ring-border" aria-labelledby="prog-title">
        <h2 id="prog-title" className="text-lg font-bold">전체 진행률</h2>
        <div className="mt-2 flex items-end gap-3">
          <span className="text-4xl font-bold text-primary">{prog.percent}%</span>
          <span className="pb-1 text-muted-foreground">{prog.done}개 완료 / 전체 {prog.total}개 (완료 체크 기준 실제 진행률)</span>
        </div>
        <div className="mt-3 h-4 rounded-full bg-muted" role="progressbar" aria-valuenow={prog.percent} aria-valuemin={0} aria-valuemax={100} aria-label="전체 진행률">
          <div className="h-4 rounded-full bg-primary transition-all" style={{ width: `${prog.percent}%` }} />
        </div>
      </section>

      <form onSubmit={add} className="mb-8 grid gap-3 rounded-2xl bg-white p-5 ring-1 ring-border md:grid-cols-[1fr_12rem_11rem_auto] md:items-end" aria-label="실행 항목 추가">
        <div className="space-y-1">
          <label htmlFor="new-title" className="font-semibold">새 실행 항목</label>
          <Input id="new-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} placeholder="예: 중장년내일센터 상담 받기" required />
        </div>
        <div className="space-y-1">
          <label htmlFor="new-cat" className="font-semibold">구분</label>
          <select id="new-cat" value={category} onChange={(e) => setCategory(e.target.value as TaskCategory)} className="h-12 w-full rounded-xl border bg-white px-3">
            {ORDER.map((c) => <option key={c} value={c}>{TASK_CATEGORY_LABEL[c]}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="new-due" className="font-semibold">목표일</label>
          <Input id="new-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
        <Button type="submit" size="lg"><Plus aria-hidden /> 추가</Button>
      </form>

      {tasks.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-white p-8 text-center text-muted-foreground">아직 실행 항목이 없습니다. <Link href="/strategy" className="font-semibold text-primary underline">전략을 선택</Link>하거나 위에서 직접 추가해 보세요.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {ORDER.map((c) => {
            const list = tasks.filter((t) => t.category === c);
            if (!list.length) return null;
            const p = progressOf(list);
            return (
              <section key={c} className="rounded-2xl bg-white p-5 ring-1 ring-border" aria-labelledby={`cat-${c}`}>
                <div className="flex items-center justify-between">
                  <h2 id={`cat-${c}`} className="text-lg font-bold">{TASK_CATEGORY_LABEL[c]}</h2>
                  <span className="text-sm text-muted-foreground">{p.done}/{p.total} 완료</span>
                </div>
                <ul className="mt-3 divide-y">
                  {list.map((t) => <TaskRow key={t.id} task={t} overdue={!t.done && !!t.dueDate && t.dueDate < today} onSave={upsertTask} onDelete={deleteTask} />)}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}

function TaskRow({ task, overdue, onSave, onDelete }: { task: ActionTask; overdue: boolean; onSave: (t: ActionTask) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [due, setDue] = useState(task.dueDate ?? "");
  const [note, setNote] = useState(task.note ?? "");

  if (editing)
    return (
      <li className="space-y-2 py-3">
        <Input aria-label="항목 제목" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Input aria-label="목표일" type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-44" />
          <Input aria-label="메모" value={note} maxLength={1000} placeholder="메모" onChange={(e) => setNote(e.target.value)} className="flex-1" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={async () => { if (title.trim()) { await onSave({ ...task, title: title.trim(), dueDate: due || undefined, note: note || undefined }); setEditing(false); } }}><Save aria-hidden /> 저장</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X aria-hidden /> 취소</Button>
        </div>
      </li>
    );

  return (
    <li className="flex items-start gap-3 py-3">
      <Checkbox checked={task.done} onCheckedChange={(v) => onSave({ ...task, done: Boolean(v) })} className="mt-1 size-6" aria-label={`${task.title} 완료 표시`} />
      <div className="min-w-0 flex-1">
        <p className={cn("font-medium", task.done && "text-muted-foreground line-through")}>{task.title}</p>
        <p className="text-sm text-muted-foreground">
          {task.dueDate && <span className={cn(overdue && "font-semibold text-destructive")}>목표일 {task.dueDate}{overdue ? " (기한 지남)" : ""}</span>}
          {task.origin === "recommendation" && " · 추천 정보에서 추가"}
          {task.note && ` · ${task.note}`}
        </p>
        <TaskLinks title={`${task.title} ${task.note ?? ""}`} sourceUrl={task.sourceUrl} />
      </div>
      <Button size="icon-sm" variant="ghost" onClick={() => setEditing(true)} aria-label={`${task.title} 수정`}><Pencil aria-hidden /></Button>
      <Button size="icon-sm" variant="ghost" onClick={() => { if (confirm("이 항목을 삭제할까요?")) onDelete(task.id); }} aria-label={`${task.title} 삭제`}><Trash2 aria-hidden /></Button>
    </li>
  );
}
