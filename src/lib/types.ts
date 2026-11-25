import type { Reference, ResearchStatus } from "@/lib/liner/events";
import type { Recommendation, Strategy } from "@/lib/report/structured";

export type ReportSource = "liner" | "demo";

/** 저장된 리서치 보고서 */
export type SavedReport = {
  id: string;
  jobId?: string;
  source: ReportSource; // demo 는 반드시 "데모 데이터"로 표시
  status: ResearchStatus;
  title: string;
  markdown: string; // 원본 보고서 전체 (구조화 블록 포함)
  references: Reference[];
  tasks: { taskId: string; task: string; isComplete: boolean }[];
  createdAt: string;
  profileHash?: string;
};

export type StrategyScenario = Strategy & { key: string; origin: "report" | "template"; reportId?: string };

export type TaskCategory = "week" | "month1" | "month3" | "month6" | "month12" | "education" | "certificate" | "application" | "resume" | "retirement" | "custom";

export type ActionTask = {
  id: string;
  title: string;
  category: TaskCategory;
  dueDate?: string; // YYYY-MM-DD
  done: boolean;
  note?: string;
  sourceUrl?: string;
  origin: "roadmap" | "user" | "recommendation";
  createdAt: string;
};

export type ActionPlan = {
  id: string;
  strategyKey?: string;
  strategyTitle?: string;
  tasks: ActionTask[];
  createdAt: string;
  updatedAt: string;
};

export type Bookmark = { id: string; rec: Recommendation; createdAt: string };

export type CoachMessage = {
  id: string;
  role: "user" | "coach";
  content: string;
  createdAt: string;
  basis?: "profile" | "report" | "liner" | "guide";
  references?: Reference[];
};

export const TASK_CATEGORY_LABEL: Record<TaskCategory, string> = {
  week: "이번 주 할 일",
  month1: "이번 달 목표",
  month3: "3개월 목표",
  month6: "6개월 목표",
  month12: "12개월 목표",
  education: "교육 신청 일정",
  certificate: "자격증 준비 일정",
  application: "지원서 제출 일정",
  resume: "경력기술서·이력서 준비",
  retirement: "노후 생활비·연금 확인",
  custom: "기타",
};
