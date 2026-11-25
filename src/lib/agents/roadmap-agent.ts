import type { ActionPlan, ActionTask, StrategyScenario, TaskCategory } from "@/lib/types";
import type { StructuredData } from "@/lib/report/structured";
import { newId } from "@/lib/id";

/** Roadmap Agent (논리 모듈): 선택한 전략 + 보고서 로드맵 → 실행 항목 */

const addDays = (base: Date, d: number) => {
  const x = new Date(base);
  x.setDate(x.getDate() + d);
  return x.toISOString().slice(0, 10);
};

const OFFSET: Record<string, number> = { week: 7, month1: 30, month3: 90, month6: 180, month12: 365 };

export function buildRoadmap(strategy: StrategyScenario | undefined, data: StructuredData | null, now = new Date()): ActionPlan {
  const tasks: ActionTask[] = [];
  const created = now.toISOString();
  const add = (title: string, category: TaskCategory, days?: number, sourceUrl?: string) =>
    tasks.push({ id: newId(), title: title.slice(0, 200), category, dueDate: days !== undefined ? addDays(now, days) : undefined, done: false, origin: "roadmap", createdAt: created, sourceUrl });

  const rm = data?.roadmap ?? {};
  for (const k of ["week", "month1", "month3", "month6", "month12"] as const) for (const t of rm[k] ?? []) add(t, k, OFFSET[k]);

  // 보고서 로드맵이 없으면 기본 실행 틀 제공
  if (!tasks.length) {
    add("진단 결과와 보고서를 읽고 우선순위 3가지 정하기", "week", 7);
    add("고용24 회원가입 및 중장년내일센터 상담 예약", "week", 7);
    add(`'${strategy?.title ?? "선택 전략"}' 관련 교육과정 2곳 비교`, "month1", 30);
    add("필요 역량 보완 교육 수강 시작", "month3", 90);
    add("목표 직무 지원 또는 사업 준비 착수", "month6", 180);
    add("1년 실행 결과 점검 및 전략 재설계", "month12", 365);
  }
  add("경력기술서·이력서 최신화", "resume", 14);
  add("국민연금 예상 수령액 조회 (국민연금공단 '내 연금 알아보기')", "retirement", 30, "https://www.nps.or.kr");
  add("은퇴 후 월 생활비 항목 점검표 작성", "retirement", 30);

  for (const r of data?.recommendations ?? []) {
    if (r.category === "education" && r.status !== "closed") add(`교육 신청: ${r.title}`, "education", undefined, r.url);
    if (r.category === "certificate") add(`자격증 준비: ${r.title}`, "certificate", undefined, r.url);
    if (r.category === "job" && r.status !== "closed") add(`지원서 제출 검토: ${r.title}`, "application", undefined, r.url);
  }

  return { id: newId(), strategyKey: strategy?.key, strategyTitle: strategy?.title, tasks: tasks.slice(0, 80), createdAt: created, updatedAt: created };
}

/** 실제 진행률 = 완료 항목 / 전체 항목 */
export function progressOf(tasks: Pick<ActionTask, "done">[]): { done: number; total: number; percent: number } {
  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}
