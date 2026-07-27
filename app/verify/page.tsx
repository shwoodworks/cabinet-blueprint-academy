import { createServerClient } from "@supabase/ssr";

// Public page — no login required. Uses a plain server-side Supabase client
// (no cookies needed) since credential_verifications is a public view.
function createPublicClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

interface Verification {
  credential_id: string;
  full_name: string;
  course_title: string;
  issued_at: string;
  revoked_at: string | null;
  is_valid: boolean;
}

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const query = (id ?? "").trim();

  let result: Verification | null = null;
  let searched = false;

  if (query) {
    searched = true;
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("credential_verifications")
      .select("*")
      .ilike("credential_id", query)
      .maybeSingle();
    result = (data as Verification) ?? null;
  }

  return (
    <main className="flex flex-1 flex-col items-center bg-neutral-50 px-4 py-16">
      <div className="w-full max-w-md">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
          Cabinet Blueprint Academy
        </p>
        <h1 className="mt-2 font-serif text-2xl font-bold text-navy">Verify a Credential</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Enter the Credential ID printed on the installer's certificate to confirm it&apos;s valid.
        </p>

        <form method="GET" className="mt-6 flex gap-2">
          <input
            type="text"
            name="id"
            defaultValue={query}
            placeholder="e.g. CBA-2026-A1B2C3D4"
            required
            className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Verify
          </button>
        </form>

        {searched && (
          <div className="mt-6 rounded-lg border p-5">
            {result ? (
              <div>
                <p
                  className={`text-sm font-semibold ${
                    result.is_valid ? "text-green-700" : "text-red-600"
                  }`}
                >
                  {result.is_valid ? "✓ Valid credential" : "✗ Revoked credential"}
                </p>
                <dl className="mt-3 flex flex-col gap-2 text-sm">
                  <div>
                    <dt className="text-neutral-500">Name</dt>
                    <dd className="font-medium text-navy">{result.full_name}</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Course</dt>
                    <dd className="font-medium text-navy">{result.course_title}</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Issued</dt>
                    <dd className="font-medium text-navy">
                      {new Date(result.issued_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Credential ID</dt>
                    <dd className="font-mono font-medium text-navy">{result.credential_id}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <p className="text-sm text-red-600">
                No credential found with that ID. Double-check it matches the certificate exactly.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
