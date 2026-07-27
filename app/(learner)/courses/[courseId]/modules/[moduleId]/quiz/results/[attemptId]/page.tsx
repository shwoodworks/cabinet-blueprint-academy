import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AssessmentAttempt, CourseModule } from "@/lib/types/database";
import type { QuestionSnapshotItem } from "@/lib/types/quiz";

export default async function LearnerQuizResultPage({
  params,
}: {
  params: Promise<{ courseId: string; moduleId: string; attemptId: string }>;
}) {
  const user = await requireRole("learner");
  const { courseId, moduleId, attemptId } = await params;
  const supabase = await createClient();

  const { data: attempt } = await supabase
    .from("assessment_attempts")
    .select("*")
    .eq("id", attemptId)
    .eq("user_id", user.id)
    .single();

  if (!attempt) notFound();

  const typedAttempt = attempt as AssessmentAttempt;
  const snapshot = (typedAttempt.question_snapshot ?? []) as QuestionSnapshotItem[];

  let nextModule: CourseModule | null = null;
  if (typedAttempt.passed) {
    const { data: currentModule } = await supabase
      .from("modules")
      .select("sequence_order")
      .eq("id", moduleId)
      .single();

    if (currentModule) {
      const { data: next } = await supabase
        .from("modules")
        .select("*")
        .eq("course_id", courseId)
        .eq("is_published", true)
        .gt("sequence_order", currentModule.sequence_order)
        .order("sequence_order", { ascending: true })
        .limit(1)
        .maybeSingle();
      nextModule = next as CourseModule | null;
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <Link href={`/courses/${courseId}/modules/${moduleId}`} className="text-sm text-neutral-500">
        ← Module
      </Link>

      <div>
        <h1 className="text-xl font-semibold">
          {typedAttempt.passed ? "Passed" : "Not passed"} — {typedAttempt.score_pct}%
        </h1>
        {!typedAttempt.passed && (
          <p className="text-sm text-neutral-600">
            <Link href={`/courses/${courseId}/modules/${moduleId}/quiz`} className="text-blue-600 underline">
              Retake the quiz
            </Link>{" "}
            or review the explanations below first.
          </p>
        )}
        {typedAttempt.passed && nextModule && (
          <Link
            href={`/courses/${courseId}/modules/${nextModule.id}`}
            className="mt-3 inline-block rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            Continue to {nextModule.title}
          </Link>
        )}
        {typedAttempt.passed && !nextModule && (
          <p className="mt-3 text-sm font-medium text-green-700">
            That was the last module —{" "}
            <Link href={`/courses/${courseId}`} className="text-blue-600 underline">
              back to the course overview
            </Link>
            .
          </p>
        )}
      </div>

      <ul className="flex flex-col gap-4">
        {snapshot.map((q, i) => (
          <li key={q.question_id} className="rounded border border-neutral-200 p-4">
            <p className="text-sm font-medium">
              {i + 1}. {q.prompt} — {q.correct ? "✓ Correct" : "✗ Incorrect"}
            </p>
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {q.options.map((o) => (
                <li
                  key={o.id}
                  className={
                    o.is_correct
                      ? "text-green-700"
                      : o.selected
                        ? "text-red-600"
                        : "text-neutral-500"
                  }
                >
                  {o.selected ? "●" : "○"} {o.label}
                  {o.is_correct ? " (correct)" : ""}
                </li>
              ))}
            </ul>
            {q.explanation && <p className="mt-2 text-xs text-neutral-500">{q.explanation}</p>}
          </li>
        ))}
      </ul>
    </main>
  );
}
