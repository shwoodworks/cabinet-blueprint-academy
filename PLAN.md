# Cabinet Blueprint Certified Installer — Implementation Plan

## 0. Summary

A web app where cabinet installers work through course modules, pass a quiz after each module, then pass a final exam to earn a "Cabinet Blueprint Certified Installer" credential — a PDF certificate plus a publicly verifiable credential ID. Three roles: Learner, Admin/Instructor, Employer/Org. V1 is text/image/PDF content only, no video, no payments.

This is a new, standalone project. Reference precedent for tooling choice: a similar "generate a PDF, let someone sign/verify it" workflow elsewhere used Next.js + Supabase (Postgres + Auth + Row Level Security) + pdf-lib — a proven, small-team-shippable combination, recommended below for the same class of problem (role-based app, relational data, generated PDFs, public read-only pages).

---

## 1. Core Domain Model

Relational schema, Postgres-flavored. All tables get `id uuid primary key default gen_random_uuid()`, `created_at timestamptz default now()` unless noted.

**organizations**
- `id`, `name`, `is_active`

**users**
- `id` (matches auth provider's user id)
- `email`, `full_name`
- `role` enum: `learner | admin | employer` — a user has exactly one primary role in v1
- `organization_id` (nullable — null for admins/instructors who aren't org-scoped; required for learners enrolled via an org and for employer-role users)

**courses**
- `id`, `title`, `description`, `is_published` (draft vs live), `created_by` (admin user id)

**modules**
- `id`, `course_id` (FK), `title`, `sequence_order` (int — defines linear progression), `is_published`

**materials**
- `id`, `module_id` (FK), `type` enum: `text | image | pdf`
- `body` (text content for `text` type) or `file_url` (for image/pdf, stored in object storage)
- `sequence_order`

**questions**
- `id`, `title/prompt` (text), `question_type` enum: `single_choice | multiple_choice | true_false`
- `explanation` (optional rationale shown after answering, for module quizzes only — not final exam, to avoid leaking exam answers)
- `scope` enum: `module_quiz | final_exam`
- `module_id` (FK, nullable — null when `scope = final_exam`)
- `course_id` (FK — needed for final exam questions, which span the whole course)
- `is_active` (soft-disable instead of delete, to preserve historical attempt integrity)

**answer_options**
- `id`, `question_id` (FK), `label` (text), `is_correct` (bool), `sequence_order`

**assessments** (a quiz or exam *definition*, not an attempt)
- `id`, `scope` enum: `module_quiz | final_exam`
- `module_id` (FK, nullable) or `course_id` (FK)
- `passing_score_pct` (int, default 80)
- `question_count` (how many questions are drawn/shown per attempt)
- `max_attempts` (nullable int — null = unlimited)
- `time_limit_minutes` (nullable, v1 default: none)

**enrollments**
- `id`, `user_id` (FK, learner), `course_id` (FK), `organization_id` (FK, nullable), `enrolled_at`, `status` enum: `in_progress | completed`

**module_progress**
- `id`, `enrollment_id` (FK), `module_id` (FK), `status` enum: `not_started | in_progress | completed`, `completed_at`

**assessment_attempts**
- `id`, `assessment_id` (FK), `user_id` (FK), `enrollment_id` (FK)
- `attempt_number` (int, per user per assessment)
- `started_at`, `submitted_at`
- `score_pct`, `passed` (bool)
- `question_snapshot` (jsonb — the actual question/option set + selections, frozen at attempt time; required so later question-bank edits don't retroactively change historical results)

**credentials** (the certificate)
- `id`, `credential_id` (short, human-typeable, unique, collision-safe — see §6), `user_id` (FK), `course_id` (FK), `enrollment_id` (FK), `issued_at`, `pdf_url`, `revoked_at` (nullable)

Relationships: Organization 1—N Users; Course 1—N Modules 1—N Materials; Course/Module 1—N Questions 1—N AnswerOptions; Course/Module 1—1(ish) Assessment; User+Assessment 1—N AssessmentAttempts; User+Course 1—1 Enrollment 1—N ModuleProgress; Enrollment 1—0/1 Credential.

---

## 2. Key User Flows

**Learner: module → quiz → next module → final exam → certificate**
1. Learner logs in, sees enrolled courses (auto-enrolled by their org, or self-enrolled if no org) with progress %.
2. Opens course → ordered module list; modules beyond the first are locked until the prior module's quiz is passed.
3. Reads/views materials, marks module "complete" → module quiz unlocks.
4. Takes module quiz → immediate pass/fail + score; explanations shown per question. Fail → retry (respecting `max_attempts`) or contact admin if attempts exhausted.
5. Once every module is passed, final exam unlocks.
6. Takes final exam (course-wide question pool, no per-question explanations, to protect exam integrity for retries).
7. Pass → credential row created, PDF certificate generated/stored, learner sees "Congratulations" page with certificate download + verification link. Fail → retry per policy.

**Admin/Instructor: author a module and its quiz**
1. Admin dashboard → Courses → create/edit course → add modules in order.
2. Add materials (text/image/PDF), reorder via sequence field.
3. Add quiz questions: prompt, options, correct answer(s), optional explanation.
4. Set assessment settings (passing %, attempt limit).
5. Preview before publishing (`is_published` toggle) — drafts invisible to learners.
6. Author final exam questions scoped to the course.

**Employer: view roster certification status**
1. Employer logs in, sees their org's roster.
2. Table view: learner name, course(s), progress %, status, credential ID + issue date if certified.
3. Employer can invite/add learners to their org and assign courses.
4. Employer **cannot** see quiz content/individual answers/per-question scores — only pass/fail, overall %, attempt count.

**Public: credential verification**
1. Anyone visits `/verify` or `/verify/<credential_id>`.
2. Shows valid/invalid/revoked; if valid: learner full name, course/cert title, issue date, org if applicable. No login required.

---

## 3. Recommended Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend + backend | **Next.js (App Router)** | Single codebase for UI + server actions/API routes; strong ecosystem, easy for a small team. |
| Database + Auth | **Supabase** (Postgres + Auth + Row Level Security) | RLS enforces "employer sees only their org," "learner sees only their own data" at the DB layer, not just app code. |
| File storage | **Supabase Storage** (or S3-compatible) | Module PDFs/images and generated certificates; signed URLs for access control. |
| PDF generation | **pdf-lib** (Node, server-side) | No headless-browser dependency, works well serverless. Template once, fill placeholders per issuance. |
| QR code | **qrcode** npm package | Encodes verification URL for printed certificates. |
| Hosting | **Vercel** | Native Next.js hosting, zero-config deploys. |
| Rich text editing (admin) | Lightweight editor (e.g. Tiptap) | In-app content authoring, no out-of-band pipeline. |

One clear recommendation, not a menu — swap components only for a strong existing preference.

---

## 4. Assessment/Exam Mechanics (confirmed defaults)

- **Passing score**: 80% for module quizzes and the final exam.
- **Retries**: 3 attempts per assessment, then admin reset required.
- **Cooldown between attempts**: none in v1.
- **Question randomization**: each attempt draws a random subset (and randomizes option order) from the active question pool, frozen into `question_snapshot`.
- **Time limit**: none in v1 (field exists in schema for future use).
- **Module gating**: strictly linear — module N+1 locked until module N's quiz is passed.

---

## 5. Auth & Access Control

- **Authentication**: Supabase Auth (email/password + optional magic link), single login for all roles; `role` is a column on `users`.
- **Authorization model**: Postgres RLS as the enforcement layer, mirrored by route guards in the app for UX.
  - **Learner**: reads published courses/modules/materials they're enrolled in; reads/writes only their own `assessment_attempts`/`module_progress`; reads only their own `credentials`.
  - **Admin/Instructor**: full read/write on `courses`, `modules`, `materials`, `questions`, `answer_options`, `assessments`. Not org-scoped — operates globally.
  - **Employer**: read-only on `users`, `enrollments`, `module_progress`, `credentials`, and **aggregate** `assessment_attempts` fields (pass/fail, score_pct, attempt_number) — explicitly **not** `question_snapshot` or `questions`/`answer_options` content. Enforced via a Postgres view (`employer_roster_view`) exposing only permitted columns, so a UI bug can't leak quiz content.
  - **Public**: read-only via a narrow `credentials_public_view`, nothing else, no direct table access.
- **Org-scoping**: enforced via `organization_id` match in RLS policy — an employer can't query another org's roster even by guessing IDs.

---

## 6. Certificate Generation & Public Verification

**Credential ID generation**
- Short, human-typeable, collision-resistant code (e.g. 8 chars, Crockford Base32-style, excludes ambiguous chars), e.g. `CBI-7K4M-9QRT`.
- Generated server-side at issuance, checked against a unique constraint, retried on rare collision.

**PDF generation**
- Single certificate template (pdf-lib) with placeholders: learner full name, course/cert title, issue date, credential ID, QR code linking to `/verify/<credential_id>`.
- Generated once server-side on final-exam pass, stored, served from storage thereafter (not regenerated per request).

**Public verification page**
- Shows validity status, cert title, issue date, and — **Decided: full name** — the learner's full name (mirrors real-world professional certification lookups; lets an employer confirm the specific person holds the credential).
- Never exposes email, quiz scores, or attempt history — only certification status.

---

## 7. Phased Build Plan

**Phase 1 — Foundation: auth, roles, basic course/module CRUD**
- Auth, role assignment, organization model.
- Admin: create/edit courses, modules, materials — no quiz yet.
- Learner: view published courses/modules, mark modules complete, see basic progress.
- Validate: an admin can author real content end-to-end, a learner can consume it.

**Phase 2 — Quiz engine**
- Question/answer authoring UI for admins.
- Assessment definitions, randomized draw, attempt recording, scoring, retry limits.
- Module gating.
- Validate: a learner can take a real quiz, get correctly blocked/unblocked.

**Phase 3 — Final exam, certificate, public verification**
- Final exam type (course-scoped pool).
- Credential ID + PDF generation/storage.
- Public `/verify` page.
- Validate: a learner passes the final exam, gets a real downloadable PDF, a third party can verify it.

**Phase 4 — Employer roster view**
- Employer role, org-scoped roster table, invite/enroll flow.
- Enforce the access boundary via the DB view from §5.
- Validate: an employer sees accurate status with no quiz-content leakage.

**Phase 5 (stretch)**
- Admin analytics on question difficulty.
- Certificate re-issuance/revocation tooling.
- Email notifications.

This ordering validates the riskiest, most novel piece (quiz engine + certificate/verification loop) before investing in the comparatively low-risk employer-facing CRUD layer.

---

## 8. Decisions (all confirmed — locked before Phase 1)

1. **Public verification page name privacy** — Full name.
2. **Exam retry policy** — 3 attempts, then admin reset required.
3. **Passing threshold** — 80% for both module quizzes and final exam.
4. **Module navigation strictness** — Strictly linear.
5. **Self-enrollment** — Allowed for learners with no org.
6. **Content review/approval** — Single-step publish, no review workflow for v1.
7. **Certificate expiration/renewal** — Certificates never expire in v1.
8. **Multiple courses / course-selection UI** — Single-course, hard-focused UI (schema supports more later).
9. **V1 scope-outs** — Confirmed out: video hosting/streaming, payments/Stripe, cert expiration/renewal, admin analytics on question difficulty, multi-role users.

## 9. Content Migration

The course materials and quiz/exam questions **already exist**, in a mix of formats (documents, slides, PDFs) — this is a migration, not from-scratch authoring.

- **Decided: no bulk-import tooling.** One-time migration; content and questions entered manually through the Phase 1 (materials) and Phase 2 (questions) admin UI, using existing source files as reference.
- **Practical implication for Phase 1**: the admin UI needs to be genuinely usable for real data entry from day one — PDF/image upload needs to work smoothly for real files, not just placeholders.
- If question volume turns out very large (many hundreds), revisit the "manual entry" call — flagged so it isn't silently re-litigated without noting the original tradeoff.

---

### Critical Files for Implementation
First files to create once build work starts:
- `supabase/schema.sql` — full domain model (§1) including RLS policies (§5)
- `supabase/migrations/00X_credentials_and_verification.sql` — credential_id generation function, `credentials_public_view`, `employer_roster_view`
- `app/(learner)/courses/[courseId]/modules/[moduleId]/page.tsx` — module-consumption + quiz-launch flow
- `lib/certificates/generate.ts` — pdf-lib certificate generation + QR embedding, called on final exam pass
- `app/verify/[credentialId]/page.tsx` — public verification page, the only unauthenticated surface
