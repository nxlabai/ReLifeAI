import { Home, ClipboardList, Search, Compass, Briefcase, GraduationCap, Landmark, PiggyBank, ListChecks, MessageCircle, User, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; description: string };

export const NAV: NavItem[] = [
  { href: "/", label: "홈", icon: Home, description: "서비스 시작과 나의 대시보드" },
  { href: "/diagnosis", label: "나의 생애전환 진단", icon: ClipboardList, description: "5단계로 나의 상황 정리" },
  { href: "/research", label: "AI 맞춤 리서치", icon: Search, description: "최신 정보를 AI가 조사" },
  { href: "/strategy", label: "인생 2막 전략", icon: Compass, description: "전략 비교와 선택" },
  { href: "/jobs", label: "추천 일자리", icon: Briefcase, description: "경력에 맞는 직무·채용" },
  { href: "/education", label: "추천 교육 및 자격증", icon: GraduationCap, description: "훈련과정·자격증" },
  { href: "/support", label: "정부지원사업", icon: Landmark, description: "참여 가능 지원 프로그램" },
  { href: "/retirement", label: "노후 준비", icon: PiggyBank, description: "연금·생활비 점검" },
  { href: "/roadmap", label: "나의 실행 로드맵", icon: ListChecks, description: "할 일과 진행률" },
  { href: "/coach", label: "AI 생애전환 코치", icon: MessageCircle, description: "내 상황에 대해 질문" },
  { href: "/mypage", label: "마이페이지", icon: User, description: "내 정보와 데이터 관리" },
];

export const PRIMARY_NAV = ["/diagnosis", "/research", "/strategy", "/roadmap", "/coach"];
