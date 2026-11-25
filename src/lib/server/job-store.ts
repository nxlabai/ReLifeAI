import "server-only";
import type { ResearchState } from "@/lib/liner/events";

/**
 * 진행 중 작업의 인스턴스 메모리 레지스트리.
 * - 중단 요청 시 AbortController 로 upstream 연결 종료
 * - Supabase 미설정(게스트) 모드에서 결과 재조회·캐시
 */
type Entry = { state: ResearchState; controller: AbortController; ownerKey: string; hash: string; updatedAt: number };

const g = globalThis as unknown as { __relifeJobs?: Map<string, Entry> };
const jobs = (g.__relifeJobs ??= new Map());

export function registerJob(id: string, e: Omit<Entry, "updatedAt">) {
  jobs.set(id, { ...e, updatedAt: Date.now() });
  if (jobs.size > 200) {
    const oldest = [...jobs.entries()].sort((a, b) => a[1].updatedAt - b[1].updatedAt).slice(0, 50);
    oldest.forEach(([k]) => jobs.delete(k));
  }
}

export function updateJob(id: string, state: ResearchState) {
  const e = jobs.get(id);
  if (e) {
    e.state = state;
    e.updatedAt = Date.now();
  }
}

export const getJob = (id: string) => jobs.get(id);

export function findJobByHash(ownerKey: string, hash: string): [string, Entry] | undefined {
  return [...jobs.entries()].find(([, e]) => e.ownerKey === ownerKey && e.hash === hash);
}
