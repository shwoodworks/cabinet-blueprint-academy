import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createQuestion, resetAttempts, setQuestionActive, upsertAssessment } from "@/app/actions/admin-quiz";
import { QuestionForm } from "@/app/components/QuestionForm";
import type { AnswerOption, Assessment, CourseModule, Question } from "@/lib/types/database";

export default async function AdminModuleQuizPage({
  params,
}: {
  params: Promise<{ courseId: string; moduleId: string }>;
}) {
  await requireRole("admin");
  const { courseId, moduleId } = await params;
  const supabase = await createClient();

  const { data: mod } = await supabase.from("modules").select("*").eq("id", moduleId).single();
  if (!mod) notFound();

  const { data: assessment } = await supabase
    .from("assessments")
    .select("*")
    .eq("module_id", moduleId)
    .eq("scope", "module_quiz")
    .maybeSingle();

  const { data: questions } = await supabase
    .from("questions")
    .select("*, answer_options(*)")
    .eq("module_id", moduleId)
    .eq("scope", "module_quiz")
    .order("created_at", { ascending: true });

  const typedModule = mod as CourseModule;
  const typedAssessment = assessment as Assessment | null;
  const typedQuestions = (questions ?? []) as (Question & { answer_options: AnswerOption[] })[];
  const activeCount = typedQuestions.filter((q) => q.is_active).length;

  let attemptRows: {
    user_id: string;
    full_name: string;
    attempts: number;
    passed: boolean;
  }[] = [];

  if (typedAssessment) {
    const { data: attempts } = await supabase
      .from("assessment_attempts")
      .select("user_id, passed, users(full_name)")
      .eq("assessment_id", typedAssessment.id);

    const byUser = new Map<string, { full_name: string; attempts: number; passed: boolean }>();
    for (const a of attempts ?? []) {
      const userRow = a as unknown as { user_id: string; passed: boolean; users: { full_name: string } | null };
      const existing = byUser.get(userRow.user_id);
      if (existing) {
        existing.attempts += 1;
        existing.passed = existing.passed || userRow.passed;
      } else {
        byUser.set(userRow.user_id, {
          full_name: userRow.users?.full_name ?? "Unknown",
          attempts: 1,
          passed: userRow.passed,
        });
      }
    }
    attemptRows = Array.from(byUser.entries()).map(([user_id, v]) => ({ user_id, ...v }));
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10">
      <Link href={`/admin/courses/${courseId}/modules/${moduleId}`} className="text-sm text-neutral-500">
        ← {typedModule.title}
      </Link>

      <h1 className="text-xl font-semibold">Quiz settings</h1>

      <section className="flex flex-col gap-3 rounded border border-neutral-200 p-4">
        <form action={upsertAssessment.bind(null, courseId, moduleId)} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Passing score (%)
            <input
              type="number"
              name="passing_score_pct"
              min={1}
              max={100}
              defaultValue={typedAssessment?.passing_score_pct ?? 80}
              required
              className="rounded border border-neutral-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Questions per attempt
            <input
              type="number"
              name="question_count"
              min={1}
              defaultValue={typedAssessment?.question_count ?? Math.max(activeCount, 1)}
              required
              className="rounded border border-neutral-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Max attempts (blank = unlimited)
            <input
              type="number"
              name="max_attempts"
              min={1}
              defaultValue={typedAssessment?.max_attempts ?? 3}
              className="rounded border border-neutral-300 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="self-start rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
          >
            {typedAssessment ? "Save settings" : "Create quiz"}
          </button>
        </form>
        {typedAssessment && activeCount < typedAssessment.question_count && (
          <p className="text-xs text-amber-600">
            Only {activeCount} active question(s) but the attempt draws {typedAssessment.question_count} — add
            more questions or lower the count.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Questions ({activeCount} active)</h2>
        <ul className="flex flex-col gap-2">
          {typedQuestions.map((q) => (
            <li key={q.id} className="rounded border border-neutral-200 px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 text-sm">
                  <p className={q.is_active ? "" : "text-neutral-400 line-through"}>{q.prompt}</p>
                  <ul className="mt-1 flex flex-col gap-0.5 text-xs text-neutral-500">
                    {q.answer_options
                      .sort((a, b) => a.sequence_order - b.sequence_order)
                      .map((o) => (
                        <li key={o.id}>
                          {o.is_correct ? "✓" : "·"} {o.label}
                        </li>
                      ))}
                  </ul>
                </div>
                <form action={setQuestionActive.bind(null, q.id, !q.is_active)}>
                  <button type="submit" className="text-xs text-neutral-500">
                    {q.is_active ? "Archive" : "Restore"}
                  </button>
                </form>
              </div>
            </li>
          ))}
          {typedQuestions.length === 0 && <p className="text-sm text-neutral-500">No questions yet.</p>}
        </ul>
      </section>

      <section className="flex flex-col gap-3 rounded border border-neutral-200 p-4">
        <h2 className="text-sm font-medium">Add question</h2>
        <QuestionForm action={createQuestion.bind(null, courseId, moduleId)} />
      </section>

      {typedAssessment && attemptRows.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">Learner attempts</h2>
          <ul className="flex flex-col gap-2">
            {attemptRows.map((row) => (
              <li
                key={row.user_id}
                className="flex items-center justify-between rounded border border-neutral-200 px-4 py-3 text-sm"
              >
                <span>
                  {row.full_name} — {row.attempts} attempt(s) — {row.passed ? "Passed" : "Not passed"}
                </span>
                {!row.passed &&
                  typedAssessment.max_attempts != null &&
                  row.attempts >= typedAssessment.max_attempts && (
                    <form
                      action={resetAttempts.bind(null, courseId, moduleId, typedAssessment.id, row.user_id)}
                    >
                      <button type="submit" className="text-xs text-red-600">
                        Reset attempts
                      </button>
                    </form>
                  )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
