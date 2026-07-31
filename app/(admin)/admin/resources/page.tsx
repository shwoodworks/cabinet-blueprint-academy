import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { uploadResource, deleteResource } from "@/app/actions/resources";

export default async function AdminResourcesPage() {
  await requireRole("admin");
  const supabase = await createClient();

  const { data: resources } = await supabase
    .from("resources")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gold">Admin</p>
        <h1 className="mt-1 font-serif text-2xl font-bold text-navy">Resources</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Upload the job document templates students can download and print.
        </p>
      </div>

      <form
        action={uploadResource}
        className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm"
      >
        <h2 className="font-serif text-lg font-semibold text-navy">Upload a document</h2>

        <label className="flex flex-col gap-1 text-sm">
          Title
          <input
            name="title"
            required
            placeholder="e.g. 1. Cabinet Installation Risk Disclosure"
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          File
          <input
            name="file"
            type="file"
            required
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>

        <button
          type="submit"
          className="self-start rounded bg-gold px-4 py-2 text-sm font-semibold text-navy hover:opacity-90"
        >
          Upload
        </button>
      </form>

      <div>
        <h2 className="font-serif text-lg font-semibold text-navy">Uploaded documents</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {(resources ?? []).map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3"
            >
              <div>
                <p className="font-medium text-navy">{r.title}</p>
                <p className="text-sm text-neutral-500">{r.file_name}</p>
              </div>
              <div className="flex items-center gap-4">
                <a
                  href={r.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-neutral-500 hover:underline"
                >
                  View
                </a>
                <form action={deleteResource.bind(null, r.id)}>
                  <button type="submit" className="text-sm text-red-600 hover:underline">
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
          {(resources ?? []).length === 0 && (
            <p className="text-sm text-neutral-500">No documents uploaded yet.</p>
          )}
        </ul>
      </div>
    </main>
  );
}
