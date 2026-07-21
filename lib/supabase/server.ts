import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Not parameterized with a generated Database type yet — see
// lib/types/database.ts for the plan to replace this with
// `supabase gen types typescript` once a project is linked. Query results
// are cast to the hand-written domain types at call sites in the meantime.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component; middleware refreshes the
            // session instead, so this can be safely ignored.
          }
        },
      },
    }
  );
}
