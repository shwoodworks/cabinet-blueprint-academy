import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Server-only admin client using the Supabase service role key. This
// bypasses Row Level Security and can perform privileged actions like
// creating auth users, so it must NEVER be imported into a client
// component or exposed to the browser. Only import this from server
// actions ("use server" files) or server components.
//
// Requires SUPABASE_SERVICE_ROLE_KEY to be set in the environment
// (Vercel project settings -> Environment Variables), copied from
// Supabase Dashboard -> Project Settings -> API -> service_role secret.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
