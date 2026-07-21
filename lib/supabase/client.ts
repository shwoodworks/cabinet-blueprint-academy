import { createBrowserClient } from "@supabase/ssr";

// Not parameterized with a generated Database type yet — see
// lib/types/database.ts for the plan to replace this with
// `supabase gen types typescript` once a project is linked. Query results
// are cast to the hand-written domain types at call sites in the meantime.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
