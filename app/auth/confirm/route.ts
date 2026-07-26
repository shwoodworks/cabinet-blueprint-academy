import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles invite, password-recovery, and email-confirmation links. Unlike
// the OAuth-style /auth/callback route (which requires the same browser
// that started the flow), this verifies a token_hash directly, so it
// works when the link is opened on a different device/browser than the
// one that triggered the invite or password reset email.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) {
      const redirectTo = new URL(next, request.url);
      return NextResponse.redirect(redirectTo);
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth-confirm-failed", request.url));
}
