-- Re:Life AI 초기 스키마
-- 실행: Supabase SQL Editor 에 붙여넣거나 "supabase db push"
-- 원칙: 모든 사용자 데이터는 RLS 로 본인만 접근. 관리자 통계는 서버(service role)에서 집계값만 조회.

create extension if not exists pgcrypto;

-- ───────────────────────── 공통 함수 ─────────────────────────
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ───────────────────────── profiles ─────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 50),
  age_band text,          -- 집계용 (연령대 코드만)
  region text,            -- 시·도 단위
  primary_purpose text,   -- 목적별 진단 현황 집계용
  role text not null default 'user' check (role in ('user', 'admin')),
  research_quota_daily int not null default 3 check (research_quota_daily between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- 일반 사용자가 자신의 role / quota 를 바꾸지 못하도록 차단
create or replace function public.protect_profile_privileges() returns trigger
language plpgsql as $$
begin
  if (new.role is distinct from old.role or new.research_quota_daily is distinct from old.research_quota_daily)
     and coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'role/quota 는 관리자(service role)만 변경할 수 있습니다';
  end if;
  return new;
end $$;

create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_privileges();
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- 회원가입 시 profiles 행 자동 생성
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── career_profiles ─────────────────────────
create table if not exists public.career_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  industries text[] not null default '{}',
  career_years text,
  current_job text,
  main_duties text,
  leadership text,
  skills text,
  digital_level text,
  certificates text,
  desired_role text,
  resume_text text,      -- 선택 입력, 외부 전송은 별도 동의 시에만
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger career_profiles_updated before update on public.career_profiles
  for each row execute function public.set_updated_at();

-- ───────────────────────── life_assessments ─────────────────────────
create table if not exists public.life_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  purpose text,
  answers jsonb not null default '{}'::jsonb,   -- 5단계 설문 전체 (경제 정보는 범위 코드만)
  consent jsonb,                                -- 외부 AI 전송 동의 내역
  completeness int check (completeness between 0 and 100),
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists life_assessments_user_idx on public.life_assessments (user_id, created_at desc);
create trigger life_assessments_updated before update on public.life_assessments
  for each row execute function public.set_updated_at();

-- ───────────────────────── research_jobs ─────────────────────────
create table if not exists public.research_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  assessment_id uuid references public.life_assessments(id) on delete set null,
  request_id text not null unique,
  source text not null default 'liner' check (source in ('liner', 'demo')),
  kind text not null default 'full' check (kind in ('full', 'followup')),
  status text not null default 'queued'
    check (status in ('queued', 'connecting', 'running', 'completed', 'failed', 'aborted', 'timeout', 'interrupted')),
  profile_hash text,            -- 중복 요청 방지/캐시 키 (원문 미저장)
  tasks jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  partial_text text,            -- 중단 시 부분 보고서 보존
  trace_id text,
  error_code text,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists research_jobs_user_idx on public.research_jobs (user_id, created_at desc);
create index if not exists research_jobs_hash_idx on public.research_jobs (user_id, profile_hash, status);
create index if not exists research_jobs_status_idx on public.research_jobs (status, created_at desc);
create trigger research_jobs_updated before update on public.research_jobs
  for each row execute function public.set_updated_at();

-- ───────────────────────── research_reports ─────────────────────────
create table if not exists public.research_reports (
  id uuid primary key default gen_random_uuid(),
  job_id uuid unique references public.research_jobs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null default 'liner' check (source in ('liner', 'demo')),
  title text not null,
  markdown text not null,       -- 원본 보고서 (구조화 블록 포함)
  structured jsonb,             -- 스키마 검증 통과한 데이터만
  parse_ok boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists research_reports_user_idx on public.research_reports (user_id, created_at desc);
create trigger research_reports_updated before update on public.research_reports
  for each row execute function public.set_updated_at();

-- ───────────────────────── research_sources ─────────────────────────
create table if not exists public.research_sources (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.research_reports(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  idx int not null,             -- 본문 인용 번호 ((n)) 와 매칭
  title text,
  url text not null check (url ~* '^https?://'),
  hostname text,
  published_date text,
  snippet text,
  created_at timestamptz not null default now(),
  unique (report_id, idx)
);
create index if not exists research_sources_report_idx on public.research_sources (report_id);

-- ───────────────────────── strategy_scenarios ─────────────────────────
create table if not exists public.strategy_scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  report_id uuid references public.research_reports(id) on delete set null,
  key text not null,
  origin text not null check (origin in ('report', 'template')),
  title text not null,
  data jsonb not null,
  selected boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);
create index if not exists strategy_scenarios_user_idx on public.strategy_scenarios (user_id, selected);
create trigger strategy_scenarios_updated before update on public.strategy_scenarios
  for each row execute function public.set_updated_at();

-- ───────────────────────── recommendations ─────────────────────────
create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  report_id uuid references public.research_reports(id) on delete cascade,
  category text not null check (category in ('job', 'education', 'certificate', 'support', 'retirement', 'startup')),
  title text not null,
  recruit_status text not null default 'unknown' check (recruit_status in ('open', 'upcoming', 'closed', 'unknown')),
  url text check (url is null or url ~* '^https?://'),
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists recommendations_user_idx on public.recommendations (user_id, category);
create trigger recommendations_updated before update on public.recommendations
  for each row execute function public.set_updated_at();

-- ───────────────────────── action_plans / action_tasks ─────────────────────────
create table if not exists public.action_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  strategy_key text,
  strategy_title text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists action_plans_user_idx on public.action_plans (user_id, is_active);
create trigger action_plans_updated before update on public.action_plans
  for each row execute function public.set_updated_at();

create table if not exists public.action_tasks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.action_plans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  category text not null,
  due_date date,
  done boolean not null default false,
  done_at timestamptz,
  note text check (note is null or char_length(note) <= 1000),
  source_url text check (source_url is null or source_url ~* '^https?://'),
  origin text not null default 'user' check (origin in ('roadmap', 'user', 'recommendation')),
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists action_tasks_plan_idx on public.action_tasks (plan_id, sort);
create index if not exists action_tasks_user_due_idx on public.action_tasks (user_id, done, due_date);
create trigger action_tasks_updated before update on public.action_tasks
  for each row execute function public.set_updated_at();

-- ───────────────────────── bookmarks ─────────────────────────
create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recommendation_id uuid references public.recommendations(id) on delete set null,
  title text not null,
  url text check (url is null or url ~* '^https?://'),
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists bookmarks_user_idx on public.bookmarks (user_id, created_at desc);

-- ───────────────────────── agent_conversations ─────────────────────────
create table if not exists public.agent_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'coach')),
  content text not null check (char_length(content) <= 20000),
  basis text check (basis in ('profile', 'report', 'liner', 'guide')),
  references_json jsonb,
  research_job_id uuid references public.research_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists agent_conversations_user_idx on public.agent_conversations (user_id, created_at);

-- ───────────────────────── api_usage_logs ─────────────────────────
-- 민감한 사용자 원문, 프롬프트, API 키는 저장하지 않는다.
create table if not exists public.api_usage_logs (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  job_id uuid references public.research_jobs(id) on delete set null,
  provider text not null default 'liner',
  endpoint text not null,          -- 예: deep-research, credits
  outcome text not null check (outcome in ('success', 'error', 'aborted', 'timeout', 'interrupted', 'cache_hit', 'rate_limited', 'duplicate')),
  http_status int,
  error_code text,
  duration_ms int,
  reference_count int,
  created_at timestamptz not null default now()
);
create index if not exists api_usage_logs_created_idx on public.api_usage_logs (created_at desc);
create index if not exists api_usage_logs_user_idx on public.api_usage_logs (user_id, created_at desc);

-- ───────────────────────── RLS ─────────────────────────
alter table public.profiles enable row level security;
alter table public.career_profiles enable row level security;
alter table public.life_assessments enable row level security;
alter table public.research_jobs enable row level security;
alter table public.research_reports enable row level security;
alter table public.research_sources enable row level security;
alter table public.strategy_scenarios enable row level security;
alter table public.recommendations enable row level security;
alter table public.action_plans enable row level security;
alter table public.action_tasks enable row level security;
alter table public.bookmarks enable row level security;
alter table public.agent_conversations enable row level security;
alter table public.api_usage_logs enable row level security;

create policy "profiles_select_own" on public.profiles for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- 본인 소유 행 전체 CRUD 정책 일괄 생성
do $$
declare t text;
begin
  foreach t in array array['career_profiles','life_assessments','research_jobs','research_reports','research_sources',
                           'strategy_scenarios','recommendations','action_plans','action_tasks','bookmarks','agent_conversations']
  loop
    execute format('create policy "%1$s_select_own" on public.%1$I for select using (user_id = auth.uid())', t);
    execute format('create policy "%1$s_insert_own" on public.%1$I for insert with check (user_id = auth.uid())', t);
    execute format('create policy "%1$s_update_own" on public.%1$I for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "%1$s_delete_own" on public.%1$I for delete using (user_id = auth.uid())', t);
  end loop;
end $$;

-- action_tasks 는 본인 plan 에만 추가 가능
drop policy if exists "action_tasks_insert_own" on public.action_tasks;
create policy "action_tasks_insert_own" on public.action_tasks for insert
  with check (user_id = auth.uid() and exists (select 1 from public.action_plans p where p.id = plan_id and p.user_id = auth.uid()));

-- 사용 로그: 본인 조회 + 본인 명의 기록만 (수정/삭제 불가)
create policy "api_usage_logs_select_own" on public.api_usage_logs for select using (user_id = auth.uid());
create policy "api_usage_logs_insert_own" on public.api_usage_logs for insert with check (user_id = auth.uid());

-- ───────────────────────── 관리자 집계 뷰 (개인 식별/경제 정보 제외) ─────────────────────────
-- service role 로만 조회 (anon/authenticated 권한 회수)
create or replace view public.admin_overview as
select
  (select count(*) from public.profiles) as total_users,
  (select count(*) from public.profiles where created_at > now() - interval '7 days') as new_users_7d,
  (select count(*) from public.research_jobs where source = 'liner') as research_total,
  (select count(*) from public.research_jobs where source = 'liner' and status = 'completed') as research_completed,
  (select count(*) from public.research_jobs where source = 'liner' and status in ('failed','timeout','interrupted')) as research_failed,
  (select count(*) from public.api_usage_logs where provider = 'liner' and endpoint = 'deep-research' and outcome not in ('cache_hit','rate_limited','duplicate')) as api_calls,
  (select count(distinct user_id) from public.action_plans) as users_with_plans,
  (select count(*) from public.action_tasks) as total_tasks,
  (select count(*) from public.action_tasks where done) as done_tasks;

revoke all on public.admin_overview from anon, authenticated;
