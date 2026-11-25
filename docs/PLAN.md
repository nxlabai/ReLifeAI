# Re:Life AI — 프로젝트 구조 및 구현 계획

> 당신의 경험을 새로운 가능성으로, 인생 2막을 설계하다

## 1. 기술 구조

| 영역 | 선택 |
| --- | --- |
| 프레임워크 | Next.js 16 (App Router, TypeScript) |
| UI | Tailwind CSS v4, shadcn/ui(base-ui), Lucide, Recharts |
| 백엔드 | Next.js Route Handler (`src/app/api/**`) |
| DB/인증 | Supabase PostgreSQL + Supabase Auth (이메일 매직링크), RLS |
| 핵심 AI | Liner Deep Research Agent API (서버에서만 호출) |
| 테스트 | Vitest (SSE 파서, 보고서 파서, 프로필, 보안 유틸) |
| 배포 | Vercel (Fluid compute, `maxDuration` 설정) |

별도의 Claude/OpenAI API 키를 사용하지 않습니다. Research/Strategy/Roadmap Agent는 **논리 모듈**이며 유료 AI 호출은 Liner Deep Research 1회뿐입니다. 전략·로드맵은 Liner 보고서에 포함된 구조화 블록(JSON)을 스키마 검증해 추출하고, 실패 시 규칙 기반 템플릿과 원본 보고서를 보여줍니다.

## 2. 폴더 구조

```
src/
  app/
    page.tsx                 홈(목적별 카드 + 로그인 사용자 대시보드)
    diagnosis/               나의 생애전환 진단 (5단계 설문)
    research/                AI 맞춤 리서치 (동의 → 실시간 진행 화면)
    report/                  개인 맞춤 분석·전략 보고서
    strategy/                인생 2막 전략 비교·선택
    jobs/ education/ support/ retirement/   추천 일자리·교육·정부지원·노후 준비
    roadmap/                 나의 실행 로드맵(체크리스트·진행률)
    coach/                   AI 생애전환 코치
    mypage/                  마이페이지(데이터 내보내기·삭제·탈퇴)
    admin/                   관리자(집계 통계만)
    login/ auth/callback/    Supabase Auth
    api/
      research/              POST: Liner 호출 + SSE 중계 / GET [id]: 작업 상태 재조회
      coach/                 POST: 저장된 보고서 기반 답변(무료), 재조사는 사용자 확인 후
      admin/stats/           GET: 관리자 집계 (service role, 관리자 검증)
      account/               DELETE: 회원 탈퇴 및 데이터 삭제
      health/                GET: 환경변수 설정 여부(값은 노출 안 함)
  components/                layout, diagnosis, research, report, roadmap, ui(shadcn)
  lib/
    liner/                   sse-parser, client(server-only), events(리듀서), errors
    agents/                  research-agent(프롬프트/쿼리 생성), strategy-agent, roadmap-agent
    assessment/              설문 옵션, 프로필 구조화, 누락 검사, 익명화·최소화
    report/                  Markdown 섹션·인용 파싱, 구조화 블록 zod 검증
    security/                URL 안전성 검사, 입력 검증, 레이트리밋, 중복 방지 해시
    data/                    저장소(로그인: Supabase / 게스트: localStorage)
    demo/                    데모 페르소나·샘플 보고서(“데모 데이터” 표기)
    supabase/                browser/server/admin 클라이언트
supabase/migrations/0001_init.sql   13개 테이블, 인덱스, 트리거, RLS
tests/                       Vitest 단위 테스트
```

## 3. AI Agent 워크플로우

1. 프로필 수집(진단) → 2. 누락 검사(`findMissingFields`) → 3. 경력·역량·목표·제약 정리(`buildStructuredProfile`)
4. 리서치 쿼리/지시문 동적 생성(`buildResearchPrompt`) → 5. Liner 호출(서버) → 6. SSE 이벤트로 태스크·출처 수집
7. 보고서 생성(스트리밍 텍스트) → 8. 시나리오 추출(`extractStrategies`) → 9. 실행 계획 생성(`buildRoadmap`)
10. 선택 저장 → 11. 체크리스트 상태 관리 → 12. 사용자 확인 후 재조사(코치/보고서 화면)

## 4. 장시간 실행(Vercel) 대응

Vercel 공식 문서(2026-08-24 갱신) 기준 Fluid compute 함수 최대 실행시간은 Hobby 300초, Pro/Enterprise 800초(베타로 1800초)이며, **스트리밍 응답도 이 제한에 포함**됩니다. 따라서:

- `/api/research`는 `maxDuration = 300`(Pro는 800까지 상향 가능)으로 설정하고 이벤트를 Supabase(`research_jobs.events_snapshot`, `research_reports`)에 주기적으로 저장합니다.
- 클라이언트 연결이 끊겨도 서버는 함수 제한시간까지 스트림을 계속 읽어 저장하고, 사용자는 `GET /api/research/[id]`로 결과를 다시 볼 수 있습니다.
- 제한시간 초과 시 작업을 `timeout`으로 표시하고 받은 부분 보고서를 보존합니다(성공으로 표시하지 않음).
- **운영 권장 구조**: 리서치를 큐(예: Supabase Queues/pg_net, Inngest, Upstash QStash) → 장시간 워커(별도 Node 서버, Supabase Edge Function 백그라운드 태스크 등)로 분리하고, 워커가 이벤트를 DB에 쓰고 브라우저는 Supabase Realtime으로 구독합니다. 인터페이스(`research_jobs` 상태 머신)는 이미 이 구조에 맞춰 두었습니다.

## 5. 개발 단계

1. 초기화·구조 설계 → 2. 디자인 시스템·홈 → 3. 진단 UI → 4. Liner 연동·파서 테스트 → 5. 진행 화면
6. 보고서·출처 → 7. 전략 비교 → 8. 로드맵 → 9~10. Supabase·로그인·저장 → 11. 코치·관리자
12. 보안·오류 처리 → 13. 모바일 점검 → 14. 배포 준비
