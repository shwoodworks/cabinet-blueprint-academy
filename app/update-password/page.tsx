"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Step = "code" | "password";

function readParam(name: string): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(name) ?? "";
}

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>("code");
  const [email, setEmail] = useState(() => readParam("email"));
  const [otpType] = useState<EmailOtpType>(() => {
    const t = readParam("type");
    return t === "recovery" ? "recovery" : "invite";
  });
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setCodeError(null);

    if (!email.trim()) {
      setCodeError("Enter your email address.");
      return;
    }
    if (!code.trim()) {
      setCodeError("Enter the code from your email.");
      return;
    }

    setCodeLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: otpType,
    });
    setCodeLoading(false);

    if (error) {
      setCodeError("That code is wrong or has expired. Ask for a fresh email and try again.");
      return;
    }

    setStep("password");
  }

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

  if (step === "code") {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
        <div>
          <h1 className="text-xl font-semibold">Enter your code</h1>
          <p className="text-sm text-neutral-500">
            Check your email for a 6-digit code and enter it below along with your email address.
          </p>
        </div>

        <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded border border-neutral-300 px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            6-digit code
            <input
              type="text"
              inputMode="numeric"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="rounded border border-neutral-300 px-3 py-2 tracking-widest"
            />
          </label>

          {codeError && <p className="text-sm text-red-600">{codeError}</p>}

          <button
            type="submit"
            disabled={codeLoading}
            className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {codeLoading ? "Checking…" : "Continue"}
          </button>
        </form>
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
