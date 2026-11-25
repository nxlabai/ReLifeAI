"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { assessmentSchema, emptyAssessment, type Assessment, type Consent } from "@/lib/assessment/schema";
import type { ActionPlan, ActionTask, Bookmark, CoachMessage, SavedReport, StrategyScenario } from "@/lib/types";
import type { Recommendation } from "@/lib/report/structured";
import { newId } from "@/lib/id";
import * as R from "./remote";

/**
 * 앱 데이터 저장소.
 * - 게스트: 브라우저 localStorage 에만 저장 (서버로 전송하지 않음)
 * - 로그인: Supabase 에 저장 (RLS), 화면 상태는 메모리에 유지
 */

export type AppData = {
  assessment: Assessment;
  consent: Consent | null;
  reports: SavedReport[];
  activeReportId: string | null;
  selectedStrategy: StrategyScenario | null;
  plan: ActionPlan | null;
  bookmarks: Bookmark[];
  coach: CoachMessage[];
};

const KEY = "relife-ai:v1";

const initial = (): AppData => ({ assessment: emptyAssessment(), consent: null, reports: [], activeReportId: null, selectedStrategy: null, plan: null, bookmarks: [], coach: [] });

function loadLocal(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initial();
    const d = JSON.parse(raw) as Partial<AppData>;
    const a = assessmentSchema.safeParse(d.assessment ?? {});
    return { ...initial(), ...d, assessment: a.success ? a.data : emptyAssessment() };
  } catch {
    return initial();
  }
}

type Ctx = {
  ready: boolean;
  user: User | null;
  data: AppData;
  syncError: string | null;
  activeReport: SavedReport | null;
  saveAssessment: (a: Assessment) => Promise<void>;
  saveConsent: (c: Consent) => Promise<void>;
  addReport: (r: SavedReport) => Promise<string>;
  upsertReportLocal: (r: SavedReport) => void;
  setActiveReport: (id: string) => void;
  reloadFromServer: () => Promise<void>;
  selectStrategy: (s: StrategyScenario, plan: ActionPlan) => Promise<void>;
  upsertTask: (t: ActionTask) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addTaskFromRecommendation: (r: Recommendation) => Promise<void>;
  toggleBookmark: (r: Recommendation) => Promise<void>;
  isBookmarked: (r: Recommendation) => boolean;
  addCoachMessage: (m: Omit<CoachMessage, "id" | "createdAt">) => Promise<CoachMessage>;
  clearAll: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AppDataContext = createContext<Ctx | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(initial);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const sb = useMemo(() => getBrowserSupabase(), []);
  const userRef = useRef<User | null>(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const reloadFromServer = useCallback(async () => {
    if (!sb || !userRef.current) return;
    try {
      const r = await R.loadRemote(sb, userRef.current.id);
      setData((d) => ({
        ...d,
        assessment: r.assessment ?? d.assessment,
        consent: r.consent ?? d.consent,
        reports: r.reports,
        activeReportId: d.activeReportId && r.reports.some((x) => x.id === d.activeReportId) ? d.activeReportId : (r.reports[0]?.id ?? null),
        selectedStrategy: r.selectedStrategy,
        plan: r.plan,
        bookmarks: r.bookmarks,
        coach: r.coach,
      }));
      setSyncError(null);
    } catch {
      setSyncError("서버에서 데이터를 불러오지 못했습니다.");
    }
  }, [sb]);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      if (sb) {
        const { data: u } = await sb.auth.getUser();
        if (u.user) {
          setUser(u.user);
          userRef.current = u.user;
          await reloadFromServer();
        } else setData(loadLocal());
        const { data: sub } = sb.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
        unsub = () => sub.subscription.unsubscribe();
      } else setData(loadLocal());
      setReady(true);
    })();
    return () => unsub?.();
  }, [sb, reloadFromServer]);

  // 게스트 모드에서만 localStorage 저장
  useEffect(() => {
    if (ready && !user) {
      try {
        localStorage.setItem(KEY, JSON.stringify(data));
      } catch {
        /* 저장 공간 부족 */
      }
    }
  }, [data, ready, user]);

  const remote = useCallback(
    async <T,>(fn: (uid: string) => Promise<T>): Promise<T | undefined> => {
      if (!sb || !userRef.current) return undefined;
      try {
        const r = await fn(userRef.current.id);
        setSyncError(null);
        return r;
      } catch {
        setSyncError("서버 저장에 실패했습니다. 네트워크를 확인해 주세요.");
        return undefined;
      }
    },
    [sb],
  );

  const ctx: Ctx = {
    ready,
    user,
    data,
    syncError,
    activeReport: data.reports.find((r) => r.id === data.activeReportId) ?? data.reports[0] ?? null,
    saveAssessment: async (a) => {
      const v = { ...a, updatedAt: new Date().toISOString() };
      setData((d) => ({ ...d, assessment: v }));
      await remote((uid) => R.saveAssessmentRemote(sb!, uid, v, data.consent));
    },
    saveConsent: async (c) => {
      setData((d) => ({ ...d, consent: c }));
      await remote((uid) => R.saveConsentRemote(sb!, uid, c));
    },
    addReport: async (r) => {
      let id = r.id;
      if (r.source === "demo") id = (await remote((uid) => R.saveDemoReportRemote(sb!, uid, r))) ?? r.id;
      const rep = { ...r, id };
      setData((d) => ({ ...d, reports: [rep, ...d.reports.filter((x) => x.id !== id)].slice(0, 20), activeReportId: id }));
      return id;
    },
    upsertReportLocal: (r) => setData((d) => ({ ...d, reports: [r, ...d.reports.filter((x) => x.id !== r.id)].slice(0, 20), activeReportId: r.id })),
    setActiveReport: (id) => setData((d) => ({ ...d, activeReportId: id })),
    reloadFromServer,
    selectStrategy: async (s, plan) => {
      setData((d) => ({ ...d, selectedStrategy: s, plan }));
      await remote((uid) => R.selectStrategyRemote(sb!, uid, s));
      const saved = await remote((uid) => R.savePlanRemote(sb!, uid, plan));
      if (saved) setData((d) => ({ ...d, plan: saved }));
    },
    upsertTask: async (t) => {
      let plan = data.plan;
      if (!plan) {
        const now = new Date().toISOString();
        plan = { id: newId(), tasks: [], createdAt: now, updatedAt: now };
        const saved = await remote((uid) => R.savePlanRemote(sb!, uid, plan!));
        if (saved) plan = saved;
      }
      const exists = plan.tasks.some((x) => x.id === t.id);
      const tasks = exists ? plan.tasks.map((x) => (x.id === t.id ? t : x)) : [...plan.tasks, t];
      const next = { ...plan, tasks, updatedAt: new Date().toISOString() };
      setData((d) => ({ ...d, plan: next }));
      const idx = tasks.findIndex((x) => x.id === t.id);
      await remote((uid) => R.upsertTaskRemote(sb!, uid, next.id, t, idx));
    },
    deleteTask: async (id) => {
      setData((d) => (d.plan ? { ...d, plan: { ...d.plan, tasks: d.plan.tasks.filter((t) => t.id !== id) } } : d));
      await remote(() => R.deleteTaskRemote(sb!, id));
    },
    addTaskFromRecommendation: async (r) => {
      const cat = r.category === "education" ? "education" : r.category === "certificate" ? "certificate" : r.category === "job" ? "application" : r.category === "retirement" ? "retirement" : "month1";
      await ctx.upsertTask({ id: newId(), title: `${r.title}${r.organization ? ` (${r.organization})` : ""}`.slice(0, 200), category: cat, done: false, origin: "recommendation", sourceUrl: r.url, createdAt: new Date().toISOString() });
    },
    isBookmarked: (r) => data.bookmarks.some((b) => b.rec.title === r.title && b.rec.url === r.url),
    toggleBookmark: async (r) => {
      const found = data.bookmarks.find((b) => b.rec.title === r.title && b.rec.url === r.url);
      if (found) {
        setData((d) => ({ ...d, bookmarks: d.bookmarks.filter((b) => b.id !== found.id) }));
        await remote(() => R.removeBookmarkRemote(sb!, found.id));
      } else {
        const b: Bookmark = { id: newId(), rec: r, createdAt: new Date().toISOString() };
        const id = await remote((uid) => R.addBookmarkRemote(sb!, uid, b));
        setData((d) => ({ ...d, bookmarks: [{ ...b, id: id ?? b.id }, ...d.bookmarks] }));
      }
    },
    addCoachMessage: async (m) => {
      const msg: CoachMessage = { ...m, id: newId(), createdAt: new Date().toISOString() };
      setData((d) => ({ ...d, coach: [...d.coach, msg].slice(-200) }));
      await remote((uid) => R.addCoachMessageRemote(sb!, uid, msg));
      return msg;
    },
    clearAll: async () => {
      await remote((uid) => R.deleteAllRemote(sb!, uid));
      localStorage.removeItem(KEY);
      setData(initial());
    },
    signOut: async () => {
      await sb?.auth.signOut();
      setUser(null);
      setData(loadLocal());
    },
  };

  return <AppDataContext.Provider value={ctx}>{children}</AppDataContext.Provider>;
}

export function useAppData(): Ctx {
  const c = useContext(AppDataContext);
  if (!c) throw new Error("AppDataProvider 가 필요합니다");
  return c;
}
