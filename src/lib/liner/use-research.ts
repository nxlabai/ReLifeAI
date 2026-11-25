"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { SSEParser, interpretEvent } from "./sse-parser";
import { initialResearchState, isTerminal, reduceResearchEvent, type ResearchError, type ResearchState } from "./events";
import type { Assessment } from "@/lib/assessment/schema";

export type StartParams = {
  assessment: Assessment;
  consent: { externalAi: true; includeEconomy: boolean; includeResume: boolean };
  force?: boolean;
  kind?: "full" | "followup";
  focus?: string;
  extraQuestion?: string;
  priorSummary?: string;
};

export type ResearchOutcome =
  | { type: "stream"; state: ResearchState; reportId?: string }
  | { type: "cached"; jobId: string }
  | { type: "error"; error: ResearchError; jobId?: string };

/** 브라우저 측: 서버가 중계하는 SSE 를 읽어 상태로 반영 (API 키는 서버에만 존재) */
export function useResearch(onDone?: (o: ResearchOutcome) => void) {
  const [state, setState] = useState<ResearchState>(initialResearchState);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const stateRef = useRef(state);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const start = useCallback(async (p: StartParams) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    let s = initialResearchState();
    s.status = "connecting";
    stateRef.current = s;
    setState(s);
    setBusy(true);
    let reportId: string | undefined;
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ ...p, confirmPaid: true }),
        signal: ac.signal,
      });
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("text/event-stream")) {
        const body = await res.json().catch(() => ({}));
        if (res.ok && body.cached) {
          onDoneRef.current?.({ type: "cached", jobId: body.jobId });
          s = { ...s, status: "completed", jobId: body.jobId };
          setState(s);
          return;
        }
        const error: ResearchError = body.error ?? { code: `HTTP_${res.status}`, message: "요청에 실패했습니다.", retryable: res.status >= 500 };
        s = reduceResearchEvent(s, { type: "relife-error", error: { ...error, httpStatus: res.status } });
        setState(s);
        onDoneRef.current?.({ type: "error", error, jobId: body.jobId });
        return;
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      const parser = new SSEParser();
      let pending = false;
      const flush = () => {
        pending = false;
        setState(stateRef.current);
      };
      const handle = (raw: { event: string; data: string }) => {
        const ev = interpretEvent(raw);
        if (ev.kind !== "json") return;
        const pl = ev.payload as { type?: string; reportId?: string };
        if (pl?.type === "relife-report") reportId = pl.reportId;
        s = reduceResearchEvent(s, ev.payload);
        stateRef.current = s;
        if (!pending) {
          pending = true;
          requestAnimationFrame(flush); // 렌더링 빈도 제한
        }
      };
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        parser.push(decoder.decode(value, { stream: true })).forEach(handle);
      }
      [...parser.push(decoder.decode()), ...parser.flush()].forEach(handle);
      if (!isTerminal(s.status)) s = reduceResearchEvent(s, { type: "relife-error", error: { code: "NETWORK_INTERRUPTED", message: "연결이 중단되었습니다.", retryable: true } });
      stateRef.current = s;
      setState(s);
      onDoneRef.current?.({ type: "stream", state: s, reportId });
    } catch (e) {
      const aborted = (e as Error).name === "AbortError";
      s = reduceResearchEvent(stateRef.current, { type: "relife-error", error: aborted ? { code: "ABORTED", message: "조사를 중단했습니다.", retryable: true } : { code: "NETWORK_INTERRUPTED", message: "네트워크 연결이 끊겼습니다.", retryable: true } });
      stateRef.current = s;
      setState(s);
      onDoneRef.current?.({ type: "stream", state: s, reportId });
    } finally {
      setBusy(false);
    }
  }, []);

  /** 중단: 서버 작업 중단 요청 후 연결 종료 */
  const stop = useCallback(async () => {
    const id = stateRef.current.jobId;
    if (id) await fetch(`/api/research/${id}`, { method: "DELETE" }).catch(() => {});
    abortRef.current?.abort();
  }, []);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return { state, busy, start, stop };
}
