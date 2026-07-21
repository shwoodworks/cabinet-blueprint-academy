import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  createFileMaterial,
  createTextMaterial,
  deleteMaterial,
} from "@/app/actions/admin";
import type { CourseModule, Material } from "@/lib/types/database";

export default async function AdminModuleDetailPage({
  params,
}: {
  params: Promise<{ courseId: string; moduleId: string }>;
}) {
  await requireRole("admin");
  const { courseId, moduleId } = await params;
  const supabase = await createClient();

  const { data: mod } = await supabase
    .from("modules")
    .select("*")
    .eq("id", moduleId)
    .single();

  if (!mod) notFound();

  const { data: materials } = await supabase
    .from("materials")
    .select("*")
    .eq("module_id", moduleId)
    .order("sequence_order", { ascending: true });

  const typedModule = mod as CourseModule;
  const typedMaterials = (materials ?? []) as Material[];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10">
      <Link href={`/admin/courses/${courseId}`} className="text-sm text-neutral-500">
        ← Course
      </Link>

      <h1 className="text-xl font-semibold">{typedModule.title}</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Materials</h2>
        <ul className="flex flex-col gap-2">
          {typedMaterials.map((material) => (
            <li
              key={material.id}
              className="flex items-start justify-between gap-4 rounded border border-neutral-200 px-4 py-3"
            >
              <div className="flex-1 text-sm">
                <span className="mb-1 block text-xs uppercase text-neutral-500">
                  {material.type}
                </span>
                {material.type === "text" ? (
                  <p className="whitespace-pre-wrap">{material.body}</p>
                ) : (
                  <a
                    href={material.file_url ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline"
                  >
                    {material.file_url}
                  </a>
                )}
              </div>
              <form action={deleteMaterial.bind(null, courseId, moduleId, material.id)}>
                <button type="submit" className="text-xs text-red-600">
                  Remove
                </button>
              </form>
            </li>
          ))}
          {typedMaterials.length === 0 && (
            <p className="text-sm text-neutral-500">No materials yet.</p>
          )}
        </ul>
      </section>

      <section className="flex flex-col gap-3 rounded border border-neutral-200 p-4">
        <h2 className="text-sm font-medium">Add text material</h2>
        <form action={createTextMaterial.bind(null, courseId, moduleId)} className="flex flex-col gap-3">
          <textarea
            name="body"
            placeholder="Content"
            required
            rows={5}
            className="rounded border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="self-start rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
          >
            Add text
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3 rounded border border-neutral-200 p-4">
        <h2 className="text-sm font-medium">Upload image or PDF</h2>
        <form action={createFileMaterial.bind(null, courseId, moduleId)} className="flex flex-col gap-3">
          <input
            type="file"
            name="file"
            accept="image/*,application/pdf"
            required
            className="text-sm"
          />
          <button
            type="submit"
            className="self-start rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
          >
            Upload
          </button>
        </form>
      </section>
    </main>
  );
}
