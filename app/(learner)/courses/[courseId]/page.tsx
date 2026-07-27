import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Course, CourseModule, ModuleProgressStatus } from "@/lib/types/database";

// This page reflects live quiz/progress state right after a submission
// redirects back here, so it must never serve a cached render.
export const dynamic = "force-dynamic";

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

  const completedCount = rows.filter((r) => r.status === "completed").length;
  const allModulesComplete = typedModules.length > 0 && completedCount === typedModules.length;

  let examState: "locked" | "available" | "passed" = "locked";
  if (allModulesComplete) {
    const { data: examAssessment } = await supabase
      .from("assessments")
      .select("id")
      .eq("course_id", courseId)
      .eq("scope", "final_exam")
      .maybeSingle();

    if (examAssessment) {
      const { data: passedAttempt } = await supabase
        .from("assessment_attempts")
        .select("id")
        .eq("assessment_id", examAssessment.id)
        .eq("user_id", user.id)
        .eq("passed", true)
        .limit(1)
        .maybeSingle();
      examState = passedAttempt ? "passed" : "available";
    }
  }

  return (
    <main className="flex flex-1 flex-col">
      <section className="bg-navy px-6 py-14">
        <div className="mx-auto max-w-4xl">
          <Link href="/courses" className="text-sm text-neutral-300 hover:text-white">
            ← My Courses
          </Link>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            Course
          </p>
          <h1 className="mt-2 font-serif text-3xl font-bold text-white sm:text-4xl">
            {typedCourse.title}
          </h1>
          {typedCourse.description && (
            <p className="mt-3 max-w-xl text-sm text-neutral-300">{typedCourse.description}</p>
          )}
          {typedModules.length > 0 && (
            <p className="mt-4 text-xs text-neutral-400">
              {completedCount}/{typedModules.length} modules complete
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <ul className="flex flex-col gap-3">
          {rows.map(({ mod, status, locked }) => (
            <li
              key={mod.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-5 py-4 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    status === "completed"
                      ? "bg-gold text-navy"
                      : locked
                      ? "bg-neutral-100 text-neutral-400"
                      : "bg-navy text-white"
                  }`}
                >
                  {status === "completed" ? "✓" : mod.sequence_order}
                </span>
                <span className={locked ? "text-neutral-400" : "font-medium text-navy"}>
                  {mod.title}
                </span>
              </div>

              {locked ? (
                <span className="text-xs text-neutral-400">Locked</span>
              ) : (
                <Link
                  href={`/courses/${courseId}/modules/${mod.id}`}
                  className="rounded bg-navy px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                >
                  {status === "completed" ? "Review" : "Start"}
                </Link>
              )}
            </li>
          ))}
          {typedModules.length === 0 && (
            <p className="text-sm text-neutral-500">No modules published yet.</p>
          )}
        </ul>

        {typedModules.length > 0 && (
          <div className="mt-6 flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center gap-4">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  examState === "passed"
                    ? "bg-gold text-navy"
                    : examState === "available"
                    ? "bg-navy text-white"
                    : "bg-neutral-100 text-neutral-400"
                }`}
              >
                {examState === "passed" ? "✓" : "★"}
              </span>
              <span className={examState === "locked" ? "text-neutral-400" : "font-medium text-navy"}>
                Final Exam
              </span>
            </div>

            {examState === "locked" && (
              <span className="text-xs text-neutral-400">Complete all modules to unlock</span>
            )}
            {examState === "available" && (
              <Link
                href={`/courses/${courseId}/exam`}
                className="rounded bg-gold px-3 py-1.5 text-xs font-medium text-navy hover:opacity-90"
              >
                Take Exam
              </Link>
            )}
            {examState === "passed" && (
              <Link
                href={`/courses/${courseId}/certificate`}
                className="rounded bg-gold px-3 py-1.5 text-xs font-medium text-navy hover:opacity-90"
              >
                View Certificate
              </Link>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
