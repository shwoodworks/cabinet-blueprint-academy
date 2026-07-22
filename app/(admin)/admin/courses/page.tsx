import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createCourse } from "@/app/actions/admin";
import type { Course } from "@/lib/types/database";

export default async function AdminCoursesPage() {
  await requireRole("admin");
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10">
      <h1 className="text-xl font-semibold">Courses</h1>

      <ul className="flex flex-col gap-2">
        {((courses ?? []) as Course[]).map((course) => (
          <li key={course.id}>
            <Link
              href={`/admin/courses/${course.id}`}
              className="flex items-center justify-between rounded border border-neutral-200 px-4 py-3 hover:bg-neutral-50"
            >
              <span>{course.title}</span>
              <span className="text-xs text-neutral-500">
                {course.is_published ? "Published" : "Draft"}
              </span>
            </Link>
          </li>
        ))}
        {(courses ?? []).length === 0 && (
          <p className="text-sm text-neutral-500">No courses yet.</p>
        )}
      </ul>

      <section className="flex flex-col gap-3 rounded border border-neutral-200 p-4">
        <h2 className="text-sm font-medium">New course</h2>
        <form action={createCourse} className="flex flex-col gap-3">
          <input
            name="title"
            placeholder="Title"
            required
            className="rounded border border-neutral-300 px-3 py-2 text-sm"
          />
          <textarea
            name="description"
            placeholder="Description"
            className="rounded border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="self-start rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
          >
            Create course
          </button>
        </form>
      </section>
    </main>
  );
}
