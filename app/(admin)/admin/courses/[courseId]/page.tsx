import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  createModule,
  reorderModule,
  setCoursePublished,
  setModulePublished,
  updateCourse,
} from "@/app/actions/admin";
import type { Course, CourseModule } from "@/lib/types/database";

export default async function AdminCourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  await requireRole("admin");
  const { courseId } = await params;
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();

  if (!course) notFound();

  const { data: modules } = await supabase
    .from("modules")
    .select("*")
    .eq("course_id", courseId)
    .order("sequence_order", { ascending: true });

  const typedCourse = course as Course;
  const typedModules = (modules ?? []) as CourseModule[];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10">
      <div className="flex items-center justify-between">
        <Link href="/admin/courses" className="text-sm text-neutral-500">
          ← Courses
        </Link>
        <form action={setCoursePublished.bind(null, courseId, !typedCourse.is_published)}>
          <button
            type="submit"
            className="rounded border border-neutral-300 px-3 py-1.5 text-xs font-medium"
          >
            {typedCourse.is_published ? "Unpublish" : "Publish"}
          </button>
        </form>
      </div>

      <section className="flex flex-col gap-3 rounded border border-neutral-200 p-4">
        <h2 className="text-sm font-medium">Course details</h2>
        <form action={updateCourse.bind(null, courseId)} className="flex flex-col gap-3">
          <input
            name="title"
            defaultValue={typedCourse.title}
            required
            className="rounded border border-neutral-300 px-3 py-2 text-sm"
          />
          <textarea
            name="description"
            defaultValue={typedCourse.description ?? ""}
            className="rounded border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="self-start rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
          >
            Save
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Modules</h2>
        <ul className="flex flex-col gap-2">
          {typedModules.map((mod, i) => (
            <li
              key={mod.id}
              className="flex items-center justify-between rounded border border-neutral-200 px-4 py-3"
            >
              <Link href={`/admin/courses/${courseId}/modules/${mod.id}`} className="flex-1">
                {mod.sequence_order}. {mod.title}{" "}
                <span className="text-xs text-neutral-500">
                  {mod.is_published ? "" : "(draft)"}
                </span>
              </Link>
              <div className="flex items-center gap-2">
                <form action={reorderModule.bind(null, courseId, mod.id, "up")}>
                  <button type="submit" disabled={i === 0} className="text-xs disabled:opacity-30">
                    ↑
                  </button>
                </form>
                <form action={reorderModule.bind(null, courseId, mod.id, "down")}>
                  <button
                    type="submit"
                    disabled={i === typedModules.length - 1}
                    className="text-xs disabled:opacity-30"
                  >
                    ↓
                  </button>
                </form>
                <form action={setModulePublished.bind(null, courseId, mod.id, !mod.is_published)}>
                  <button type="submit" className="text-xs text-neutral-500">
                    {mod.is_published ? "Unpublish" : "Publish"}
                  </button>
                </form>
              </div>
            </li>
          ))}
          {typedModules.length === 0 && (
            <p className="text-sm text-neutral-500">No modules yet.</p>
          )}
        </ul>

        <form action={createModule.bind(null, courseId)} className="flex gap-2">
          <input
            name="title"
            placeholder="New module title"
            required
            className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
          >
            Add module
          </button>
        </form>
      </section>
    </main>
  );
}
