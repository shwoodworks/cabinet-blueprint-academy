-- Cabinet Blueprint Certified Installer — full domain model (see PLAN.md §1)
-- Postgres/Supabase. Run against a fresh Supabase project.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type user_role as enum ('learner', 'admin', 'employer');
create type material_type as enum ('text', 'image', 'pdf');
create type question_type as enum ('single_choice', 'multiple_choice', 'true_false');
create type assessment_scope as enum ('module_quiz', 'final_exam');
create type enrollment_status as enum ('in_progress', 'completed');
create type module_progress_status as enum ('not_started', 'in_progress', 'completed');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Mirrors auth.users; id matches the Supabase Auth user id.
create table users (
  id uuid primary key,
  email text not null unique,
  full_name text not null,
  role user_role not null default 'learner',
  organization_id uuid references organizations(id),
  created_at timestamptz not null default now()
);

create table courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  is_published boolean not null default false,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

create table modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  sequence_order integer not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (course_id, sequence_order)
);

create table materials (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  type material_type not null,
  body text,
  file_url text,
  sequence_order integer not null,
  created_at timestamptz not null default now(),
  constraint materials_content_check check (
    (type = 'text' and body is not null) or
    (type in ('image', 'pdf') and file_url is not null)
  )
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  question_type question_type not null,
  explanation text,
  scope assessment_scope not null,
  module_id uuid references modules(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint questions_module_scope_check check (
    (scope = 'module_quiz' and module_id is not null) or
    (scope = 'final_exam' and module_id is null)
  )
);

create table answer_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  label text not null,
  is_correct boolean not null default false,
  sequence_order integer not null,
  created_at timestamptz not null default now()
);

create table assessments (
  id uuid primary key default gen_random_uuid(),
  scope assessment_scope not null,
  module_id uuid references modules(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  passing_score_pct integer not null default 80,
  question_count integer not null,
  max_attempts integer default 3,
  time_limit_minutes integer,
  created_at timestamptz not null default now(),
  constraint assessments_module_scope_check check (
    (scope = 'module_quiz' and module_id is not null) or
    (scope = 'final_exam' and module_id is null)
  )
);

create table enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  organization_id uuid references organizations(id),
  enrolled_at timestamptz not null default now(),
  status enrollment_status not null default 'in_progress',
  unique (user_id, course_id)
);

create table module_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  module_id uuid not null references modules(id) on delete cascade,
  status module_progress_status not null default 'not_started',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (enrollment_id, module_id)
);

create table assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  attempt_number integer not null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score_pct integer,
  passed boolean,
  question_snapshot jsonb not null,
  unique (assessment_id, user_id, attempt_number)
);

create table credentials (
  id uuid primary key default gen_random_uuid(),
  credential_id text not null unique,
  user_id uuid not null references users(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  issued_at timestamptz not null default now(),
  pdf_url text,
  revoked_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index modules_course_id_idx on modules(course_id);
create index materials_module_id_idx on materials(module_id);
create index questions_module_id_idx on questions(module_id);
create index questions_course_id_idx on questions(course_id);
create index answer_options_question_id_idx on answer_options(question_id);
create index enrollments_user_id_idx on enrollments(user_id);
create index enrollments_course_id_idx on enrollments(course_id);
create index module_progress_enrollment_id_idx on module_progress(enrollment_id);
create index assessment_attempts_user_id_idx on assessment_attempts(user_id);
create index credentials_user_id_idx on credentials(user_id);
create index users_organization_id_idx on users(organization_id);

-- ---------------------------------------------------------------------------
-- Helper: current user's role / org, for use inside RLS policies
-- ---------------------------------------------------------------------------

create function auth_user_role() returns user_role
  language sql stable security definer set search_path = public as $$
  select role from users where id = auth.uid();
$$;

create function auth_user_org() returns uuid
  language sql stable security definer set search_path = public as $$
  select organization_id from users where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security (see PLAN.md §5)
-- ---------------------------------------------------------------------------

alter table organizations enable row level security;
alter table users enable row level security;
alter table courses enable row level security;
alter table modules enable row level security;
alter table materials enable row level security;
alter table questions enable row level security;
alter table answer_options enable row level security;
alter table assessments enable row level security;
alter table enrollments enable row level security;
alter table module_progress enable row level security;
alter table assessment_attempts enable row level security;
alter table credentials enable row level security;

-- users: everyone can read their own row; admins read/write all; employers
-- read users in their org.
create policy users_select_self on users for select
  using (id = auth.uid());
create policy users_select_admin on users for select
  using (auth_user_role() = 'admin');
create policy users_select_employer_org on users for select
  using (auth_user_role() = 'employer' and organization_id = auth_user_org());
create policy users_write_admin on users for all
  using (auth_user_role() = 'admin') with check (auth_user_role() = 'admin');

-- organizations: admins full access; employers/learners read their own org.
create policy organizations_select_own on organizations for select
  using (id = auth_user_org() or auth_user_role() = 'admin');
create policy organizations_write_admin on organizations for all
  using (auth_user_role() = 'admin') with check (auth_user_role() = 'admin');

-- courses: admins full access; everyone else reads published courses only.
create policy courses_select_published on courses for select
  using (is_published or auth_user_role() = 'admin');
create policy courses_write_admin on courses for all
  using (auth_user_role() = 'admin') with check (auth_user_role() = 'admin');

-- modules: same shape as courses.
create policy modules_select_published on modules for select
  using (is_published or auth_user_role() = 'admin');
create policy modules_write_admin on modules for all
  using (auth_user_role() = 'admin') with check (auth_user_role() = 'admin');

-- materials: readable if the parent module is readable.
create policy materials_select on materials for select
  using (
    auth_user_role() = 'admin'
    or exists (
      select 1 from modules m where m.id = materials.module_id and m.is_published
    )
  );
create policy materials_write_admin on materials for all
  using (auth_user_role() = 'admin') with check (auth_user_role() = 'admin');

-- questions / answer_options / assessments: admin-authored, not directly
-- readable by learners (delivered via server-side attempt logic instead),
-- never readable by employers.
create policy questions_admin_only on questions for all
  using (auth_user_role() = 'admin') with check (auth_user_role() = 'admin');
create policy answer_options_admin_only on answer_options for all
  using (auth_user_role() = 'admin') with check (auth_user_role() = 'admin');
create policy assessments_admin_only on assessments for all
  using (auth_user_role() = 'admin') with check (auth_user_role() = 'admin');

-- enrollments: learners see/manage their own; admins full access; employers
-- read their org's enrollments.
create policy enrollments_select_self on enrollments for select
  using (user_id = auth.uid());
create policy enrollments_select_employer_org on enrollments for select
  using (auth_user_role() = 'employer' and organization_id = auth_user_org());
create policy enrollments_select_admin on enrollments for select
  using (auth_user_role() = 'admin');
create policy enrollments_insert_self on enrollments for insert
  with check (user_id = auth.uid() or auth_user_role() = 'admin');
create policy enrollments_write_admin on enrollments for update
  using (auth_user_role() = 'admin');

-- module_progress: learners read/write their own; admins full access;
-- employers read via enrollment org match.
create policy module_progress_self on module_progress for all
  using (
    exists (select 1 from enrollments e where e.id = module_progress.enrollment_id and e.user_id = auth.uid())
  )
  with check (
    exists (select 1 from enrollments e where e.id = module_progress.enrollment_id and e.user_id = auth.uid())
  );
create policy module_progress_select_employer_org on module_progress for select
  using (
    auth_user_role() = 'employer'
    and exists (
      select 1 from enrollments e where e.id = module_progress.enrollment_id and e.organization_id = auth_user_org()
    )
  );
create policy module_progress_admin on module_progress for all
  using (auth_user_role() = 'admin') with check (auth_user_role() = 'admin');

-- assessment_attempts: learners read/write their own; admins full access;
-- employers get aggregate fields only via employer_roster_view (not this
-- table directly) — see migrations/002_credentials_and_verification.sql.
create policy assessment_attempts_self on assessment_attempts for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy assessment_attempts_admin on assessment_attempts for all
  using (auth_user_role() = 'admin') with check (auth_user_role() = 'admin');

-- credentials: learners read their own; admins full access; employers read
-- their org's via join on enrollments; public access is via
-- credentials_public_view only.
create policy credentials_select_self on credentials for select
  using (user_id = auth.uid());
create policy credentials_select_employer_org on credentials for select
  using (
    auth_user_role() = 'employer'
    and exists (
      select 1 from enrollments e where e.id = credentials.enrollment_id and e.organization_id = auth_user_org()
    )
  );
create policy credentials_admin on credentials for all
  using (auth_user_role() = 'admin') with check (auth_user_role() = 'admin');
