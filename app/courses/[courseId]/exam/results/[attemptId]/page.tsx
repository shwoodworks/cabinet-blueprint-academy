import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AssessmentAttempt } from "@/lib/types/database";
import type { QuestionSnapshotItem } from "@/lib/types/quiz";

export default async function LearnerFinalExamResultPage({
  params,
}: {
  params: Promise<{ courseId: string; attemptId: string }>;
}) {
  const user = await requireRole("learner");
  const { courseId, attemptId } = await params;
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

  let credentialId: string | null = null;
  if (typedAttempt.passed) {
    const { data: credential } = await supabase
      .from("credentials")
      .select("credential_id")
      .eq("enrollment_id", typedAttempt.enrollment_id)
      .eq("course_id", courseId)
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    credentialId = credential?.credential_id ?? null;
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <Link href={`/courses/${courseId}`} className="text-sm text-neutral-500">
        ← Course
      </Link>

      <div>
        <h1 className="text-xl font-semibold">
          {typedAttempt.passed ? "You passed the final exam" : "Not passed"} — {typedAttempt.score_pct}%
        </h1>

        {typedAttempt.passed ? (
          <div className="mt-3 rounded-lg border border-gold bg-amber-50 px-4 py-3">
            <p className="text-sm font-medium text-navy">Certification earned</p>
            {credentialId && (
              <p className="mt-1 text-sm text-neutral-700">Credential ID: {credentialId}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-neutral-600">
            <Link href={`/courses/${courseId}/exam`} className="text-blue-600 underline">
              Retake the final exam
            </Link>{" "}
            or review the explanations below first.
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
