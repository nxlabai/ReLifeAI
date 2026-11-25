# Re:Life AI

> **당신의 경험을 새로운 가능성으로, 인생 2막을 설계하다**

40대 이후 중장년층의 퇴직·이직·경력전환·재취업·은퇴 준비를 돕는 AI Agent 웹서비스입니다.
진단 → AI 리서치(Liner Deep Research) → 전략 수립 → 실행 로드맵 → 진행 관리 → 코치·재조사가 하나로 연결됩니다.

- AI 리서치·전략 생성은 **Liner Deep Research Agent API만** 사용합니다. Claude/OpenAI 등 별도 AI 키가 필요 없습니다.
- `LINER_API_KEY`·Supabase 설정이 없어도 **데모 모드와 전체 UI**가 동작합니다(게스트 데이터는 브라우저에만 저장).

자세한 설계는 [docs/PLAN.md](docs/PLAN.md)를 참고하세요.

- 배포 데모: https://relife-ai-lemon.vercel.app

### 심사용 빠른 실행 (Liner API 키 교체)

```bash
npm install
cp .env.example .env.local      # LINER_API_KEY= 에 심사용 키 입력 (Supabase 값은 비워도 됨)
npm run build && npm start      # http://localhost:3000
```

- 코드에는 API 키가 없습니다. 모든 키는 `.env.local`(환경변수)에서만 읽습니다.
- Supabase 값을 비워 두면 로그인 없이(게스트 모드) 실제 Liner 리서치까지 실행할 수 있고, 결과는 브라우저에 저장됩니다.
- 키 없이도 홈 화면 “데모 모드 → 샘플 결과 보기”로 전체 흐름을 체험할 수 있습니다(샘플은 “데모 데이터”로 표시).

### Liner API를 사용하는 기능

| 기능 | 화면 | 서버 코드 | Liner 사용 방식 |
| --- | --- | --- | --- |
| AI 맞춤 리서치 (핵심) | `/research` | `src/app/api/research/route.ts`, `src/lib/liner/*` | 진단 결과로 만든 익명 프로필 + 맞춤 지시문을 Deep Research Agent API(`POST /api/v1/agents/deep-research`, `stream: true`, `lang: ko`)로 보내고, SSE 이벤트를 실시간 중계·저장 |
| 진행 화면 | `/research` | `src/lib/liner/events.ts` | `data-search-tasks`·참조의 실제 검색어·`data-search-references`로 조사 항목/검색 단계/출처를 표시, `text-delta`로 보고서 실시간 출력 |
| 보고서·전략·로드맵 | `/report`, `/strategy`, `/roadmap` | `src/lib/report/*`, `src/lib/agents/*` | Liner 보고서의 인용 `((n))`을 출처 원문과 연결하고, 보고서 끝 구조화 블록(JSON)을 스키마 검증해 전략 비교·추천 카드·실행 로드맵 생성 (추가 AI 호출 없음) |
| AI 생애전환 코치 | `/coach` | `src/lib/agents/coach-agent.ts` | 평소에는 저장된 보고서로 무료 답변, 최신 정보가 필요할 때만 사용자 확인 후 Deep Research 재호출 |
| 관리자 크레딧 조회 | `/admin` | `src/app/api/admin/stats/route.ts` | `GET /api/v1/credits/balance`로 잔여 크레딧 표시 |

---

## 1. 주요 기능

| 메뉴 | 내용 |
| --- | --- |
| 홈 | 목적별 시작 카드 6종, 로그인·저장 데이터가 있으면 대시보드(진단·최근 리서치·진행률·다음 할 일·추천) |
| 나의 생애전환 진단 | 5단계 인터랙티브 설문(모두 선택 입력, 건너뛰기 가능), 누락 항목 안내, 이력 텍스트 불러오기 |
| AI 맞춤 리서치 | 외부 전송 동의(필수/경제정보/경력원문 분리) + 전송 데이터 미리보기 → 유료 호출 확인 → 실시간 진행 화면(실제 이벤트 기반 태스크·검색 단계·출처·보고서 스트리밍), 중단·재시도 |
| 맞춤 보고서 | 안전한 Markdown 렌더링, 인용 `((n))` → 출처 원문 링크, 목차, 전략 요약·타임라인·추천 카드, 구조화 파싱 실패 시 원본 표시 |
| 인생 2막 전략 | 최소 3개 전략 비교(장단점·준비기간·비용·위험), 유형 추가/제외, 근거가 있을 때만 추정 점수·차트 표시, 선택 시 로드맵 생성 |
| 추천 일자리 / 교육·자격증 / 정부지원사업 / 노후 준비 | 모집 상태(모집 중·예정·종료·확인 필요) 구분, 스크랩, 실행 계획에 추가, 공식 사이트 바로가기, 노후 점검표 |
| 나의 실행 로드맵 | 이번 주~12개월·교육·자격증·지원서·이력서·연금 항목, 추가·수정·삭제, 체크 기반 실제 진행률 |
| AI 생애전환 코치 | 저장된 프로필·보고서로 무료 답변, 최신 정보가 필요하면 **사용자 확인 후에만** Liner 재조사 |
| 마이페이지 | 동의 내역, 데이터 내려받기, 데이터 전체 삭제, 로그아웃, 회원 탈퇴 |
| 관리자 (`/admin`) | 가입자·연령대·목적별 현황, 리서치 완료/실패, API 호출 수, 크레딧 조회, 실행 계획 진행률 분포, 오류 목록 (집계값만) |
| 데모 모드 | 페르소나 3종(52세 제조업 관리직, 47세 사무직, 60세 퇴직자) 자동 입력, 샘플 보고서는 항상 “데모 데이터” 표시 |

## 2. 기술 스택

Next.js 16 (App Router, TypeScript) · Tailwind CSS v4 · shadcn/ui(base-ui) · Lucide · Recharts · Supabase(PostgreSQL, Auth, RLS) · Zod · Vitest · Vercel

## 3. 폴더 구조

```
src/
  app/                    페이지와 Route Handler (코치는 추가 API 없이 무료 로컬 모듈로 동작)
    api/research/         POST: Liner 호출 + SSE 중계·저장 / GET: 게스트 작업 조회
    api/research/[id]/    GET: 작업·보고서·출처 재조회 / DELETE: 조사 중단
    api/admin/stats/      관리자 집계 (profiles.role = admin 검증 + service role)
    api/account/          회원 탈퇴
    api/health/           설정 여부만 반환 (키 값 미노출)
    auth/callback/        Supabase 매직링크 코드 교환
  components/             화면 컴포넌트 (home, diagnosis, research, report, strategy, roadmap, coach, admin, ui)
  lib/
    liner/                client.ts(서버 전용) · sse-parser.ts · events.ts(리듀서) · errors.ts · use-research.ts
    agents/               research-agent(프롬프트) · strategy-agent · roadmap-agent · coach-agent
    assessment/           설문 옵션 · zod 스키마 · 프로필 구조화/익명화/누락 검사
    report/               Markdown 섹션·인용 처리 · 구조화 블록 스키마 검증
    security/             URL 안전성 · 레이트리밋
    data/                 저장소 (로그인: Supabase / 게스트: localStorage)
    demo/                 데모 페르소나 · 샘플 보고서
    supabase/             browser / server / admin 클라이언트
  proxy.ts                Supabase 세션 갱신 (Next 16 의 middleware)
supabase/migrations/0001_init.sql   스키마·인덱스·트리거·RLS
scripts/                  모의 Liner 서버, API·UI 통합 테스트
tests/                    Vitest 단위 테스트
```

## 4. 로컬 실행

```bash
npm install
cp .env.example .env.local     # Windows PowerShell: Copy-Item .env.example .env.local
npm run dev                    # http://localhost:3000
```

아무 키도 넣지 않으면 데모 모드로 실행됩니다. 실제 리서치를 하려면 `.env.local`에 `LINER_API_KEY`를 넣고 서버를 다시 시작하세요.

### 환경변수

| 이름 | 필수 | 설명 |
| --- | --- | --- |
| `LINER_API_KEY` | 실제 리서치 시 | Liner API 키. **서버에서만** 읽으며 브라우저·로그·DB에 남기지 않습니다 |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 로그인·저장 시 | Supabase 공개 설정 |
| `SUPABASE_SERVICE_ROLE_KEY` | 탈퇴·관리자 | 서버 전용. `NEXT_PUBLIC_` 금지 |
| `RESEARCH_DAILY_LIMIT` | 선택 | 사용자별 하루 리서치 횟수 (기본 3) |
| `RESEARCH_CACHE_HOURS` | 선택 | 같은 조건 결과 재사용 시간 (기본 168) |
| `RESEARCH_MAX_SECONDS` | 선택 | 1회 실행 예산 (기본 285초) |
| `ALLOW_GUEST_RESEARCH` | 선택 | Supabase 사용 시 비로그인 리서치 허용 (기본 false) |

## 5. Supabase 설정

1. Supabase 프로젝트 생성 → **SQL Editor**에 `supabase/migrations/0001_init.sql` 전체 실행 (또는 `supabase db push`).
2. **Authentication → URL Configuration**에 Site URL과 Redirect URL(`https://<도메인>/auth/callback`, `http://localhost:3000/auth/callback`) 추가.
3. Email(매직링크) 로그인 활성화.
4. 관리자 지정: `update public.profiles set role = 'admin' where id = '<사용자 UUID>';` (SQL Editor, service role 권한)

테이블: `profiles, career_profiles, life_assessments, research_jobs, research_reports, research_sources, strategy_scenarios, recommendations, action_plans, action_tasks, bookmarks, agent_conversations, api_usage_logs` — 모두 RLS 적용(본인 행만), 사용자가 자신의 `role`/할당량을 바꾸지 못하도록 트리거로 차단, 관리자 집계 뷰 `admin_overview`는 anon/authenticated 권한 회수.

## 6. Liner Deep Research 연동

공식 문서(https://liner.com/ko/developers/docs/deep-research-agent-api, 2026-11-25 확인) 기준:

- `POST https://platform.liner.com/api/v1/agents/deep-research`
- 헤더: `x-api-key`, `Content-Type: application/json`, `Accept: text/event-stream`
- 본문: `{ messages: [{ role, content }], lang: "ko", stream: true, request_id }` — 마지막 메시지는 항상 `user` (코드에서 검증)
- 이벤트: `start, start-step, data-search-tasks, data-search-step, data-search-references, data-search-chunks, reasoning-*, text-start, text-delta, text-end, data-metadata, finish-step, finish, data-error, [DONE]`

구현 포인트
- **전용 SSE 파서**(`src/lib/liner/sse-parser.ts`): 청크 경계에서 잘린 JSON/줄, 한 청크의 복수 이벤트, CRLF 분할, UTF-8 멀티바이트 분할, 주석·keep-alive, 마지막 빈 줄 누락을 처리합니다.
- **리듀서**(`events.ts`): 서버(저장)와 브라우저(표시)가 같은 로직 사용. 알 수 없는 이벤트는 무시해 앱 동작을 바꿀 수 없습니다. `reasoning-delta`(내부 추론)는 브라우저로 보내지 않습니다.
- **진행 표시**: 가짜 진행률 없이 실제 `data-search-tasks`의 완료/진행 태스크 수와 출처 수만 표시합니다. 문서에 형식이 없는 `data-search-step`은 읽을 수 있는 문자열이 있을 때만 표시합니다.
- **인용**: 본문의 `((n))`을 수신 순서대로 번호 붙인 출처 `n`과 연결하고, 출처는 `research_sources`에 번호와 함께 저장합니다.
- **오류 처리**: 401/403 인증, 402 크레딧 부족, 429 레이트리밋(Retry-After), 5xx, 연결 시간 초과, 스트림 중 `data-error`, 완료 신호 없는 종료(네트워크 중단), 서버 실행시간 초과, 사용자 중단을 구분합니다. 실패·중단된 결과는 부분 보고서로 보존하되 **완료로 표시하지 않습니다.**

### 장시간 실행과 Vercel 제한

Vercel 문서(2026-08-24 갱신) 기준 Fluid compute 함수 최대 실행시간은 **Hobby 300초, Pro/Enterprise 800초(베타 1800초)** 이며, **스트리밍 응답도 이 시간에 포함**됩니다.

- `/api/research`는 `maxDuration = 300`, 내부 실행 예산 285초. Pro 플랜이면 `maxDuration`을 800으로 올리고 `RESEARCH_MAX_SECONDS`를 조정하세요.
- 클라이언트가 떠나도 서버는 `after()`로 남은 시간 동안 계속 읽어 Supabase에 4초마다 진행 상황을 저장하고, 결과는 `GET /api/research/[id]`로 복구됩니다.
- **운영 권장(백그라운드 작업 구조)**: 긴 리서치가 잦다면 `research_jobs`를 큐로 삼아 별도 워커(Supabase Queues + 장시간 워커, Inngest, Upstash QStash, 별도 Node 서버 등)가 Liner를 호출·저장하고, 브라우저는 Supabase Realtime으로 `research_jobs`를 구독하도록 분리하세요. 상태 머신(`queued → connecting → running → completed/failed/...`)은 이미 이 구조에 맞춰져 있습니다.

## 7. 보안·개인정보

- API 키는 서버 환경변수에만 존재 (`server-only` 모듈), 클라이언트 번들·로그·DB 미저장. `/api/health`는 설정 여부(true/false)만 반환.
- 외부 전송 전 명시 동의(필수/경제정보/경력원문 개별), 전송 내용 미리보기, 이름·연락처 미수집, 지역은 시·도, 경제 정보는 범위 코드, 자유 입력의 전화번호·이메일·주민번호·URL 자동 마스킹.
- 사용자별 일일 호출 제한, 진행 중 중복 실행 차단(409), 같은 조건 결과 캐시(비용 없음), 유료 호출은 `confirmPaid` + 확인 대화상자 필수.
- Zod 서버 입력 검증, Markdown raw HTML 비활성화·이미지 미표시, 외부 링크 http(s)·사설망·자격증명 포함 URL 차단, `noopener noreferrer`.
- 프롬프트 인젝션 방어: 프로필·질문은 "데이터로만 취급" 블록에 넣고, 검색 결과는 렌더링만 할 뿐 어떤 내용도 앱 동작(권한·데이터·호출)을 바꾸지 못합니다. 구조화 데이터는 스키마 검증 통과 항목만 사용.
- RLS로 본인 데이터만 접근, 관리자는 집계값만 조회(개인 진단·경제 정보·보고서 본문·대화 미조회), 로그인 리다이렉트 오픈 리다이렉트 방지.
- `api_usage_logs`에는 결과·상태코드·오류코드·소요시간·출처 수만 저장(프롬프트·응답 원문·키 없음).
- 회원 탈퇴 시 `auth.users` 삭제 → 전 테이블 cascade 삭제, 마이페이지에서 데이터만 삭제하는 기능도 제공.

## 8. 테스트

```bash
npm run typecheck && npm run lint && npm test     # 타입·린트·단위 테스트(36개)
npm run build                                      # 프로덕션 빌드
```

**모의 Liner 서버 통합 테스트** (실제 Liner 를 호출하지 않음):

```bash
npm run mock:liner                                 # 터미널 1: http://127.0.0.1:4010
# 터미널 2 (PowerShell)
$env:LINER_API_KEY="test-key"; $env:LINER_MOCK_URL="http://127.0.0.1:4010/api/v1/agents/deep-research"; $env:RESEARCH_DAILY_LIMIT="20"; npx next dev -p 3100
npm run test:api -- http://localhost:3100          # 터미널 3: 정상/401/402/data-error/스트림 끊김
npm run test:ui -- http://localhost:3100 test-results   # 로컬 Chrome 으로 UI·모바일 점검
```

**실제 Liner API 테스트**: `.env.local`에 실제 `LINER_API_KEY`를 넣고 `npm run dev` → 진단 → AI 맞춤 리서치 → 동의 → 실행. (1회당 사용료 발생)

### 주요 기능 테스트 결과 (2026-11-25, 로컬 Windows)

| 항목 | 결과 |
| --- | --- |
| TypeScript / ESLint / 프로덕션 빌드 | 통과 |
| 단위 테스트 (SSE 파서, 이벤트 리듀서, 실제 Liner 응답 형태 픽스처, 보고서·인용 파싱, 스키마, 개인정보 마스킹, URL 보안, 요청 본문) | 36/36 통과 |
| `/api/research` 통합 테스트 (모의 Liner: 정상, 401, 402, data-error, 완료 신호 없는 종료, 입력 검증) | 11/11 통과 |
| UI 점검 (홈, 데모 보고서, 전략 선택, 로드맵 체크·추가, 진단 단계 이동, 모의 리서치 진행 화면, 코치, 모바일 375px 가로 넘침 없음·전체 메뉴, 콘솔 오류 없음) | 24/24 통과 |
| **실제 Liner API 호출** (2026-11-25, 비로그인 경로, 2회) | **성공** – 각 171초·160초 소요, `completed` 종료, 보고서 약 2.3만 자, 출처 166개, 본문 인용 35개 모두 출처와 연결됨, 구조화 데이터(전략 3·추천 8·로드맵 5단계) 스키마 검증 통과 |
| **Supabase 스키마** | **적용 완료** – 13개 테이블 생성, 공개 키로 조회 시 RLS 로 빈 결과·관리자 뷰 접근 거부(42501) 확인 |
| **Supabase 로그인·저장** (2026-11-25) | **성공** – 로그인 후 진단(life_assessments·career_profiles·profiles 집계 필드), 실제 리서치 1회(144초, research_jobs `completed`, 보고서·출처 119개·추천 9개 저장, api_usage_logs 메타데이터만 기록), 전략 선택(strategy_scenarios)·로드맵 22개 항목·체크 상태 저장 확인 |
| 관리자 페이지 (2026-11-25) | **성공** – 관리자 권한 계정으로 가입자·연령대·목적·리서치·API 호출·실행 계획 집계와 Liner 잔여 크레딧(`/api/v1/credits/balance`, `balance_usd` 등) 표시 확인 |
| 회원 탈퇴 | 미검증 – 실제 계정이 삭제되므로 실행하지 않았습니다 |

## 9. Vercel 배포

1. GitHub 저장소에 푸시 (`.env.local`은 커밋되지 않음).
2. Vercel → New Project → 저장소 선택 (Framework: Next.js 자동 인식).
3. **Settings → Environment Variables**에 위 환경변수 입력 (`SUPABASE_SERVICE_ROLE_KEY`, `LINER_API_KEY`는 서버 전용).
4. Fluid compute 활성 상태 확인(기본값). Pro 플랜이면 `src/app/api/research/route.ts`의 `maxDuration`을 800까지 상향 가능.
5. 배포 후 Supabase Auth Redirect URL에 `https://<배포 도메인>/auth/callback` 추가.

## 10. 알려진 제약

- 실제 응답 확인 결과(2026-11-25): 인용 `((n))`은 수신 순서 n번째 참조와 일치하며(청크 `num`과도 일치), 위험 링크를 버려도 번호가 밀리지 않게 처리했습니다. `data-search-step` 이벤트는 오지 않았고, 대신 참조의 `searchQuery`(실제 검색어)를 검색 단계로 표시합니다. 태스크는 지시문 전체가 1개 태스크로 오므로 요약 이름으로 표시합니다. 문서에 없는 `data-update`, `data-search-decision`, `data-rich-content`, `data-quickanswer-queries`, `data-highlight-phrases` 이벤트도 오며, 하이라이트·후속 질문만 사용하고 나머지는 무시합니다.
- 실제 보고서가 지정한 11개 제목 대신 분석 항목 12개를 제목으로 쓴 사례가 있어 프롬프트를 보강했습니다. 제목이 달라도 보고서는 원문 그대로 표시되고 목차도 자동 생성됩니다.
- 실제 리서치는 160~171초가 걸렸습니다. Vercel Hobby(300초)에서는 여유가 있지만, 더 긴 질문은 제한에 닿을 수 있어 백그라운드 워커 구조를 권장합니다.
- 크레딧 잔액 API 응답(`billing_type`, `balance_usd` 등)은 실제 응답으로 확인해 금액으로 표시하고, 형식이 다르면 원본 JSON을 보여줍니다.
- 게스트(비로그인) 모드의 레이트리밋·작업 상태는 서버 인스턴스 메모리 기반입니다. 운영 시 로그인 필수(기본값) 또는 Redis 등으로 교체를 권장합니다.
- 게스트로 저장한 데이터는 로그인 시 계정으로 자동 이전되지 않습니다(내려받기 후 재입력).
