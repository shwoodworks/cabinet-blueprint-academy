import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { submitFinalExam } from "@/app/actions/exam";
import { shuffle } from "@/lib/quiz";
import type { AnswerOption, Assessment, Course, CourseModule, Question } from "@/lib/types/database";

export default async function LearnerFinalExamPage({
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
  const typedCourse = course as Course;

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .single();
  if (!enrollment) redirect("/courses");

  const { data: modules } = await supabase
    .from("modules")
    .select("id")
    .eq("course_id", courseId)
    .eq("is_published", true);
  const typedModules = (modules ?? []) as Pick<CourseModule, "id">[];

  const { data: progress } = await supabase
    .from("module_progress")
    .select("module_id, status")
    .eq("enrollment_id", enrollment.id)
    .eq("status", "completed");
  const completedIds = new Set((progress ?? []).map((p) => p.module_id));

  const allModulesComplete =
    typedModules.length > 0 && typedModules.every((m) => completedIds.has(m.id));

  if (!allModulesComplete) {
    redirect(`/courses/${courseId}`);
  }

  const { data: assessment } = await supabase
    .from("assessments")
    .select("*")
    .eq("course_id", courseId)
    .eq("scope", "final_exam")
    .maybeSingle();
  if (!assessment) redirect(`/courses/${courseId}`);
  const typedAssessment = assessment as Assessment;

  const { count: attemptCount } = await supabase
    .from("assessment_attempts")
    .select("id", { count: "exact", head: true })
    .eq("assessment_id", typedAssessment.id)
    .eq("user_id", user.id);

  const attemptsUsed = attemptCount ?? 0;
  const attemptsExhausted =
    typedAssessment.max_attempts != null && attemptsUsed >= typedAssessment.max_attempts;

  if (attemptsExhausted) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
        <Link href={`/courses/${courseId}`} className="text-sm text-neutral-500">
          ← {typedCourse.title}
        </Link>
        <h1 className="text-xl font-semibold">No attempts remaining</h1>
        <p className="text-sm text-neutral-600">
          You&apos;ve used all {typedAssessment.max_attempts} attempts for the final exam without
          passing. Contact your admin to reset your attempts.
        </p>
      </main>
    );
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("*, answer_options(*)")
    .eq("course_id", courseId)
    .eq("scope", "final_exam")
    .eq("is_active", true);

  const pool = (questions ?? []) as (Question & { answer_options: AnswerOption[] })[];

  if (pool.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
        <Link href={`/courses/${courseId}`} className="text-sm text-neutral-500">
          ← {typedCourse.title}
        </Link>
        <p className="text-sm text-neutral-500">The final exam has no questions yet — check back later.</p>
      </main>
    );
  }

  const drawn = shuffle(pool).slice(0, Math.min(typedAssessment.question_count, pool.length));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10">
      <Link href={`/courses/${courseId}`} className="text-sm text-neutral-500">
        ← {typedCourse.title}
      </Link>

      <div>
        <h1 className="text-xl font-semibold">Final Exam</h1>
        <p className="text-sm text-neutral-500">
          {drawn.length} question(s) · {typedAssessment.passing_score_pct}% to pass
          {typedAssessment.max_attempts != null &&
            ` · attempt ${attemptsUsed + 1} of ${typedAssessment.max_attempts}`}
        </p>
      </div>

      <form action={submitFinalExam.bind(null, courseId, typedAssessment.id)} className="flex flex-col gap-6">
        {drawn.map((question, i) => {
          const options = shuffle(question.answer_options);
          return (
            <fieldset key={question.id} className="rounded border border-neutral-200 p-4">
              <input type="hidden" name="question_ids" value={question.id} />
              <legend className="px-1 text-sm font-medium">
                {i + 1}. {question.prompt}
              </legend>
              <div className="mt-2 flex flex-col gap-2">
                {options.map((option) => (
                  <label key={option.id} className="flex items-center gap-2 text-sm">
                    <input
                      type={question.question_type === "multiple_choice" ? "checkbox" : "radio"}
                      name={`answer_${question.id}`}
                      value={option.id}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}

        <button
          type="submit"
          className="self-start rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Submit final exam
        </button>
      </form>
    </main>
  );
}
