"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { AnswerOption, Assessment, Question } from "@/lib/types/database";
import type { QuestionSnapshotItem } from "@/lib/types/quiz";

export async function submitQuiz(
  courseId: string,
  moduleId: string,
  assessmentId: string,
  formData: FormData
) {
  const user = await requireRole("learner");
  const supabase = await createClient();

  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .single();
  if (enrollmentError || !enrollment) throw new Error("Not enrolled in this course");

  const { data: assessment, error: assessmentError } = await supabase
    .from("assessments")
    .select("*")
    .eq("id", assessmentId)
    .single();
  if (assessmentError || !assessment) throw new Error("Assessment not found");
  const typedAssessment = assessment as Assessment;

  const { count: attemptCount } = await supabase
    .from("assessment_attempts")
    .select("id", { count: "exact", head: true })
    .eq("assessment_id", assessmentId)
    .eq("user_id", user.id);

  if (typedAssessment.max_attempts != null && (attemptCount ?? 0) >= typedAssessment.max_attempts) {
    throw new Error("No attempts remaining — contact an admin to reset");
  }

  const questionIds = formData.getAll("question_ids").map(String);
  if (questionIds.length === 0) throw new Error("No questions submitted");

  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("*, answer_options(*)")
    .in("id", questionIds);
  if (questionsError || !questions) throw new Error("Could not load questions");

  const questionsById = new Map(
    (questions as (Question & { answer_options: AnswerOption[] })[]).map((q) => [q.id, q])
  );

  const snapshot: QuestionSnapshotItem[] = [];
  let correctCount = 0;

  for (const questionId of questionIds) {
    const question = questionsById.get(questionId);
    if (!question) continue;

    const selectedIds = new Set(formData.getAll(`answer_${questionId}`).map(String));
    const correctIds = new Set(question.answer_options.filter((o) => o.is_correct).map((o) => o.id));

    const isCorrect =
      selectedIds.size === correctIds.size && [...selectedIds].every((id) => correctIds.has(id));

    if (isCorrect) correctCount += 1;

    snapshot.push({
      question_id: question.id,
      prompt: question.prompt,
      question_type: question.question_type,
      explanation: question.explanation,
      correct: isCorrect,
      options: question.answer_options
        .sort((a, b) => a.sequence_order - b.sequence_order)
        .map((o) => ({
          id: o.id,
          label: o.label,
          is_correct: o.is_correct,
          selected: selectedIds.has(o.id),
        })),
    });
  }

  const scorePct = Math.round((correctCount / questionIds.length) * 100);
  const passed = scorePct >= typedAssessment.passing_score_pct;

  const { data: attempt, error: attemptError } = await supabase
    .from("assessment_attempts")
    .insert({
      assessment_id: assessmentId,
      user_id: user.id,
      enrollment_id: enrollment.id,
      attempt_number: (attemptCount ?? 0) + 1,
      submitted_at: new Date().toISOString(),
      score_pct: scorePct,
      passed,
      question_snapshot: snapshot,
    })
    .select("id")
    .single();

  if (attemptError || !attempt) throw new Error(attemptError?.message ?? "Could not record attempt");

  await supabase.from("module_progress").upsert(
    {
      enrollment_id: enrollment.id,
      module_id: moduleId,
      status: passed ? "completed" : "in_progress",
      completed_at: passed ? new Date().toISOString() : null,
    },
    { onConflict: "enrollment_id,module_id" }
  );

  revalidatePath(`/courses/${courseId}`);
  redirect(`/courses/${courseId}/modules/${moduleId}/quiz/results/${attempt.id}`);
}
