import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function StudentResourcesPage() {
  await requireRole("learner");
  const supabase = await createClient();

  const { data: resources } = await supabase
    .from("resources")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gold">Resources</p>
        <h1 className="mt-1 font-serif text-2xl font-bold text-navy">Job Documents</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Download and print these contract and job templates for use on site.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {(resources ?? []).map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3"
          >
            <div>
              <p className="font-medium text-navy">{r.title}</p>
              <p className="text-sm text-neutral-500">{r.file_name}</p>
            </div>
            <a
              href={r.file_url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="rounded bg-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Download
            </a>
          </li>
        ))}
        {(resources ?? []).length === 0 && (
          <p className="text-sm text-neutral-500">No documents available yet.</p>
        )}
      </ul>
    </main>
  );
}
