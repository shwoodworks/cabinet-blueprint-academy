import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Course, CourseModule, ModuleProgressStatus } from "@/lib/types/database";

export default async function LearnerCourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const user = await requireRole("learner");
  const { courseId } = await params;
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .eq("is_published", true)
    .single();

  if (!course) notFound();

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .single();

  if (!enrollment) redirect("/courses");

  const { data: modules } = await supabase
    .from("modules")
    .select("*")
    .eq("course_id", courseId)
    .eq("is_published", true)
    .order("sequence_order", { ascending: true });

  const { data: progress } = await supabase
    .from("module_progress")
    .select("module_id, status")
    .eq("enrollment_id", enrollment.id);

  const statusByModule = new Map(
    (progress ?? []).map((p) => [p.module_id, p.status as ModuleProgressStatus])
  );

  const typedCourse = course as Course;
  const typedModules = (modules ?? []) as CourseModule[];

  const rows = typedModules.reduce<
    { mod: CourseModule; status: ModuleProgressStatus; locked: boolean }[]
  >((acc, mod) => {
    const priorCompleted = acc.length === 0 || acc[acc.length - 1].status === "completed";
    const status = statusByModule.get(mod.id) ?? "not_started";
    acc.push({ mod, status, locked: !priorCompleted });
    return acc;
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <Link href="/courses" className="text-sm text-neutral-500">
        ← My Courses
      </Link>

      <div>
        <h1 className="text-xl font-semibold">{typedCourse.title}</h1>
        {typedCourse.description && (
          <p className="text-sm text-neutral-500">{typedCourse.description}</p>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {rows.map(({ mod, status, locked }) => {
          return (
            <li
              key={mod.id}
              className="flex items-center justify-between rounded border border-neutral-200 px-4 py-3"
            >
              <span>
                {mod.sequence_order}. {mod.title}
              </span>
              {locked ? (
                <span className="text-xs text-neutral-400">Locked</span>
              ) : (
                <Link
                  href={`/courses/${courseId}/modules/${mod.id}`}
                  className="rounded bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white"
                >
                  {status === "completed" ? "Review" : "Start"}
                </Link>
              )}
            </li>
          );
        })}
        {typedModules.length === 0 && (
          <p className="text-sm text-neutral-500">No modules published yet.</p>
        )}
      </ul>
    </main>
  );
}
