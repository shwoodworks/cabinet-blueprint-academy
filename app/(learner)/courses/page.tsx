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
    <main className="flex flex-1 flex-col">
      <section className="bg-navy px-6 py-14">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            Cabinet Blueprint Academy
          </p>
          <h1 className="mt-2 font-serif text-3xl font-bold text-white sm:text-4xl">
            My Courses
          </h1>
          <p className="mt-3 max-w-xl text-sm text-neutral-300">
            Pick up where you left off, or start a new course toward your Cabinet Blueprint
            Certified Installer credential.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <ul className="grid gap-5 sm:grid-cols-2">
          {((courses ?? []) as Course[]).map((course) => {
            const enrollmentId = enrollmentByCourse.get(course.id);
            const progress = enrollmentId ? progressByEnrollment.get(enrollmentId) : undefined;
            const pct =
              progress && progress.total > 0
                ? Math.round((progress.completed / progress.total) * 100)
                : 0;

            return (
              <li
                key={course.id}
                className="flex flex-col justify-between rounded-lg border border-neutral-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gold">
                    Course
                  </p>
                  <h2 className="mt-1 font-serif text-xl font-semibold text-navy">
                    {course.title}
                  </h2>
                  {course.description && (
                    <p className="mt-2 text-sm text-neutral-500">{course.description}</p>
                  )}
                </div>

                {enrollmentId && progress && progress.total > 0 && (
                  <div className="mt-4">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                      <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-neutral-400">
                      {progress.completed}/{progress.total} modules complete
                    </p>
                  </div>
                )}

                <div className="mt-5">
                  {enrollmentId ? (
                    <Link
                      href={`/courses/${course.id}`}
                      className="inline-block rounded bg-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                    >
                      Continue
                    </Link>
                  ) : (
                    <form action={enrollInCourse.bind(null, course.id)}>
                      <button
                        type="submit"
                        className="rounded bg-gold px-4 py-2 text-sm font-semibold text-navy hover:opacity-90"
                      >
                        Enroll
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {(courses ?? []).length === 0 && (
          <p className="text-sm text-neutral-500">No courses available yet.</p>
        )}
      </section>
    </main>
  );
}
