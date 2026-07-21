# Cabinet Blueprint Academy

Web app where cabinet installers work through course modules, pass a quiz
after each module, then pass a final exam to earn a "Cabinet Blueprint
Certified Installer" credential — a PDF certificate plus a publicly
verifiable credential ID.

See [`PLAN.md`](./PLAN.md) for the full domain model, user flows, and
phased build plan. This repo currently implements **Phase 1**: auth, roles,
and course/module/material CRUD (no quiz engine yet).

## Stack

Next.js (App Router) + Supabase (Postgres, Auth, Row Level Security,
Storage) + pdf-lib (certificate generation, Phase 3) + qrcode.

## Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` against it (SQL editor or `supabase db push`).
3. Create a public Storage bucket named `materials` for module images/PDFs.
4. Copy `.env.example` to `.env.local` and fill in your Supabase project
   URL and anon key.
5. Seed at least one `admin`-role row in `users` (matching a Supabase Auth
   user id) so you can log in and author content.
6. `npm install && npm run dev` — open http://localhost:3000.

## Structure

- `supabase/schema.sql` — full domain model + RLS policies.
- `lib/supabase/` — browser/server/middleware Supabase clients.
- `lib/auth.ts` — current-user + role-guard helpers used by server components.
- `app/(admin)/admin/courses/...` — course/module/material authoring.
- `app/(learner)/courses/...` — course consumption, progress, mark-complete.
- `app/login`, `app/actions/auth.ts` — email/password auth.
