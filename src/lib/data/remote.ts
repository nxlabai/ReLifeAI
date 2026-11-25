"use client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assessmentSchema, type Assessment, type Consent } from "@/lib/assessment/schema";
import { completeness } from "@/lib/assessment/profile";
import type { ActionPlan, ActionTask, Bookmark, CoachMessage, SavedReport, StrategyScenario } from "@/lib/types";
import type { Reference } from "@/lib/liner/events";

/** Supabase 저장소 (RLS로 본인 데이터만 접근) */

export async function loadRemote(sb: SupabaseClient, userId: string) {
  const [as, reps, sel, plan, bms, conv] = await Promise.all([
    sb.from("life_assessments").select("answers, consent").eq("user_id", userId).eq("is_current", true).order("created_at", { ascending: false }).limit(1),
    sb.from("research_reports").select("id, job_id, source, title, markdown, created_at, research_sources(idx,title,url,hostname,published_date,snippet), research_jobs(status, tasks)").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    sb.from("strategy_scenarios").select("data").eq("user_id", userId).eq("selected", true).limit(1),
    sb.from("action_plans").select("id, strategy_key, strategy_title, created_at, updated_at, action_tasks(*)").eq("user_id", userId).eq("is_active", true).order("created_at", { ascending: false }).limit(1),
    sb.from("bookmarks").select("id, data, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
    sb.from("agent_conversations").select("id, role, content, basis, references_json, created_at").eq("user_id", userId).order("created_at").limit(200),
  ]);

  const a = as.data?.[0];
  const parsedA = a ? assessmentSchema.safeParse(a.answers) : null;

  type Row = { id: string; job_id: string | null; source: "liner" | "demo"; title: string; markdown: string; created_at: string; research_sources: { idx: number; title: string; url: string; hostname: string; published_date: string | null; snippet: string | null }[]; research_jobs: { status: string; tasks: SavedReport["tasks"] } | null };
  const reports: SavedReport[] = ((reps.data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    jobId: r.job_id ?? undefined,
    source: r.source,
    status: (r.research_jobs?.status as SavedReport["status"]) ?? "completed",
    title: r.title,
    markdown: r.markdown,
    references: (r.research_sources ?? []).sort((x, y) => x.idx - y.idx).map<Reference>((s) => ({ index: s.idx, title: s.title, url: s.url, hostname: s.hostname, date: s.published_date ?? undefined, snippet: s.snippet ?? undefined })),
    tasks: r.research_jobs?.tasks ?? [],
    createdAt: r.created_at,
  }));

  type PlanRow = { id: string; strategy_key: string | null; strategy_title: string | null; created_at: string; updated_at: string; action_tasks: { id: string; title: string; category: ActionTask["category"]; due_date: string | null; done: boolean; note: string | null; source_url: string | null; origin: ActionTask["origin"]; created_at: string; sort: number }[] };
  const p = (plan.data?.[0] ?? null) as PlanRow | null;
  const actionPlan: ActionPlan | null = p
    ? {
        id: p.id, strategyKey: p.strategy_key ?? undefined, strategyTitle: p.strategy_title ?? undefined, createdAt: p.created_at, updatedAt: p.updated_at,
        tasks: (p.action_tasks ?? []).sort((x, y) => x.sort - y.sort).map((t) => ({ id: t.id, title: t.title, category: t.category, dueDate: t.due_date ?? undefined, done: t.done, note: t.note ?? undefined, sourceUrl: t.source_url ?? undefined, origin: t.origin, createdAt: t.created_at })),
      }
    : null;

  return {
    assessment: parsedA?.success ? parsedA.data : null,
    consent: (a?.consent as Consent | null) ?? null,
    reports,
    selectedStrategy: (sel.data?.[0]?.data as StrategyScenario | undefined) ?? null,
    plan: actionPlan,
    bookmarks: (bms.data ?? []).map((b) => ({ id: b.id, rec: b.data, createdAt: b.created_at })) as Bookmark[],
    coach: (conv.data ?? []).map((c) => ({ id: c.id, role: c.role, content: c.content, basis: c.basis ?? undefined, references: c.references_json ?? undefined, createdAt: c.created_at })) as CoachMessage[],
  };
}

export async function saveAssessmentRemote(sb: SupabaseClient, userId: string, a: Assessment, consent: Consent | null) {
  await sb.from("life_assessments").update({ is_current: false }).eq("user_id", userId).eq("is_current", true);
  await sb.from("life_assessments").insert({ user_id: userId, purpose: a.purpose ?? null, answers: a, consent, completeness: completeness(a), is_current: true });
  await sb.from("career_profiles").upsert(
    {
      user_id: userId, industries: a.career.industries, career_years: a.career.careerYears ?? null, current_job: a.basic.currentJob ?? null, main_duties: a.career.mainDuties ?? null,
      leadership: a.career.leadership ?? null, skills: a.career.skills ?? null, digital_level: a.career.digital ?? null, certificates: a.career.certificates ?? null,
      desired_role: a.career.desiredRole ?? null, resume_text: a.career.resumeText ?? null,
    },
    { onConflict: "user_id" },
  );
  await sb.from("profiles").update({ age_band: a.basic.ageBand ?? null, region: a.basic.region ?? null, primary_purpose: a.purpose ?? null }).eq("id", userId);
}

export async function saveConsentRemote(sb: SupabaseClient, userId: string, consent: Consent) {
  await sb.from("life_assessments").update({ consent }).eq("user_id", userId).eq("is_current", true);
}

export async function saveDemoReportRemote(sb: SupabaseClient, userId: string, r: SavedReport): Promise<string | null> {
  const { data } = await sb.from("research_reports").insert({ user_id: userId, source: "demo", title: r.title, markdown: r.markdown, parse_ok: false }).select("id").single();
  if (!data) return null;
  if (r.references.length)
    await sb.from("research_sources").insert(r.references.map((s) => ({ report_id: data.id, user_id: userId, idx: s.index, title: s.title, url: s.url, hostname: s.hostname, published_date: s.date ?? null, snippet: s.snippet ?? null })));
  return data.id;
}

export async function selectStrategyRemote(sb: SupabaseClient, userId: string, s: StrategyScenario) {
  await sb.from("strategy_scenarios").update({ selected: false }).eq("user_id", userId);
  await sb.from("strategy_scenarios").upsert({ user_id: userId, key: s.key, origin: s.origin, title: s.title, data: s, selected: true, report_id: isUuid(s.reportId) ? s.reportId : null }, { onConflict: "user_id,key" });
}

export async function savePlanRemote(sb: SupabaseClient, userId: string, plan: ActionPlan): Promise<ActionPlan> {
  await sb.from("action_plans").update({ is_active: false }).eq("user_id", userId);
  const { data } = await sb.from("action_plans").insert({ user_id: userId, strategy_key: plan.strategyKey ?? null, strategy_title: plan.strategyTitle ?? null, is_active: true }).select("id").single();
  if (!data) return plan;
  const rows = plan.tasks.map((t, i) => taskRow(t, data.id, userId, i));
  const { data: inserted } = await sb.from("action_tasks").insert(rows).select("id, sort");
  const ids = new Map((inserted ?? []).map((r) => [r.sort, r.id]));
  return { ...plan, id: data.id, tasks: plan.tasks.map((t, i) => ({ ...t, id: ids.get(i) ?? t.id })) };
}

export async function upsertTaskRemote(sb: SupabaseClient, userId: string, planId: string, t: ActionTask, sort: number) {
  const { data } = await sb.from("action_tasks").upsert({ ...taskRow(t, planId, userId, sort), id: t.id }).select("id").single();
  return data?.id as string | undefined;
}

export async function deleteTaskRemote(sb: SupabaseClient, id: string) {
  await sb.from("action_tasks").delete().eq("id", id);
}

const taskRow = (t: ActionTask, planId: string, userId: string, sort: number) => ({
  plan_id: planId, user_id: userId, title: t.title, category: t.category, due_date: t.dueDate ?? null, done: t.done, done_at: t.done ? new Date().toISOString() : null,
  note: t.note ?? null, source_url: t.sourceUrl ?? null, origin: t.origin, sort,
});

export async function addBookmarkRemote(sb: SupabaseClient, userId: string, b: Bookmark) {
  const { data } = await sb.from("bookmarks").insert({ user_id: userId, title: b.rec.title, url: b.rec.url ?? null, data: b.rec }).select("id").single();
  return data?.id as string | undefined;
}
export async function removeBookmarkRemote(sb: SupabaseClient, id: string) {
  await sb.from("bookmarks").delete().eq("id", id);
}
export async function addCoachMessageRemote(sb: SupabaseClient, userId: string, m: CoachMessage) {
  await sb.from("agent_conversations").insert({ user_id: userId, role: m.role, content: m.content.slice(0, 20000), basis: m.basis ?? null, references_json: m.references ?? null });
}

/** 개인 데이터 일괄 삭제 (계정은 유지) */
export async function deleteAllRemote(sb: SupabaseClient, userId: string) {
  for (const t of ["agent_conversations", "bookmarks", "action_tasks", "action_plans", "recommendations", "strategy_scenarios", "research_sources", "research_reports", "research_jobs", "life_assessments", "career_profiles"]) {
    await sb.from(t).delete().eq("user_id", userId);
  }
  await sb.from("profiles").update({ age_band: null, region: null, primary_purpose: null, display_name: null }).eq("id", userId);
}

const isUuid = (v?: string) => Boolean(v && /^[0-9a-f-]{36}$/i.test(v));
