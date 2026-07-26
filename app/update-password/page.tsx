"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type LinkStatus = "checking" | "ready" | "invalid";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [linkStatus, setLinkStatus] = useState<LinkStatus>("checking");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase's invite/reset link lands here with the session info tucked
    // into the URL's hash fragment (e.g. #access_token=...&type=invite, or
    // #error=access_denied&error_code=otp_expired if the link is dead).
    // The Supabase browser client reads that hash automatically on load and
    // turns it into a real session - we just need to wait for it and show
    // something sensible either way instead of a blank/confusing screen.
    const hash = window.location.hash;
    if (hash.includes("error=")) {
      const params = new URLSearchParams(hash.replace("#", ""));
      const description = params.get("error_description");
      setLinkError(
        description
          ? decodeURIComponent(description.replace(/\+/g, " "))
          : "This link is invalid or has expired."
      );
      setLinkStatus("invalid");
      return;
    }

    let settled = false;

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (settled) return;
      if (session) {
        settled = true;
        setLinkStatus("ready");
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (settled) return;
      if (data.session) {
        settled = true;
        setLinkStatus("ready");
      }
    });

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      setLinkError("This link is invalid or has expired.");
      setLinkStatus("invalid");
    }, 5000);

    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  if (linkStatus === "checking") {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-neutral-500">Checking your link…</p>
      </main>
    );
  }

  if (linkStatus === "invalid") {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-xl font-semibold">Link expired</h1>
        <p className="text-sm text-neutral-600">{linkError}</p>
        <p className="text-sm text-neutral-600">
          Ask whoever invited you to send a fresh invite, then open it directly from your email
          app rather than forwarding or copying it.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-xl font-semibold">Choose a new password</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          New password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Confirm new password
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save new password"}
        </button>
      </form>
    </main>
  );
}
