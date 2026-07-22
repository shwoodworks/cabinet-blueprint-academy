import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { enrollInCourse } from "@/app/actions/learner";
import type { Course, ModuleProgress } from "@/lib/types/database";

export default async function LearnerCoursesPage() {
  const user = await requireRole("learner");
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id, course_id")
    .eq("user_id", user.id);

  const enrollmentByCourse = new Map((enrollments ?? []).map((e) => [e.course_id, e.id]));

  const progressByEnrollment = new Map<string, { total: number; completed: number }>();
  if (enrollments && enrollments.length > 0) {
    const { data: modulesByCourse } = await supabase
      .from("modules")
      .select("id, course_id")
      .eq("is_published", true);

    const { data: progress } = await supabase
      .from("module_progress")
      .select("enrollment_id, status")
      .in(
        "enrollment_id",
        enrollments.map((e) => e.id)
      );

    for (const e of enrollments) {
      const totalModules = (modulesByCourse ?? []).filter((m) => m.course_id === e.course_id).length;
      const completed = (progress ?? []).filter(
        (p: Pick<ModuleProgress, "enrollment_id" | "status">) =>
          p.enrollment_id === e.id && p.status === "completed"
      ).length;
      progressByEnrollment.set(e.id, { total: totalModules, completed });
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <h1 className="text-xl font-semibold">My Courses</h1>

      <ul className="flex flex-col gap-2">
        {((courses ?? []) as Course[]).map((course) => {
          const enrollmentId = enrollmentByCourse.get(course.id);
          const progress = enrollmentId ? progressByEnrollment.get(enrollmentId) : undefined;

          return (
            <li
              key={course.id}
              className="flex items-center justify-between rounded border border-neutral-200 px-4 py-3"
            >
              <div>
                <p className="font-medium">{course.title}</p>
                {course.description && (
                  <p className="text-sm text-neutral-500">{course.description}</p>
                )}
              </div>

              {enrollmentId ? (
                <Link
                  href={`/courses/${course.id}`}
                  className="rounded bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white"
                >
                  {progress ? `${progress.completed}/${progress.total} modules` : "Continue"}
                </Link>
              ) : (
                <form action={enrollInCourse.bind(null, course.id)}>
                  <button
                    type="submit"
                    className="rounded border border-neutral-300 px-3 py-1.5 text-xs font-medium"
                  >
                    Enroll
                  </button>
                </form>
              )}
            </li>
          );
        })}
        {(courses ?? []).length === 0 && (
          <p className="text-sm text-neutral-500">No courses available yet.</p>
        )}
      </ul>
    </main>
  );
}
