"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import type { AnswerOption, Assessment, Question } from "@/lib/types/database";
import type { QuestionSnapshotItem } from "@/lib/types/quiz";

export async function submitFinalExam(
  courseId: string,
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
  if (assessmentError || !assessment) throw new Error("Final exam not found");
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

  if (passed) {
    // Issue the credential via the admin client, not the learner's own RLS-
    // bound client — credentials are only ever written by trusted
    // server-side logic that has just verified a genuine passing score.
    const adminClient = createAdminClient();
    const credentialId = `CBA-${new Date().getFullYear()}-${attempt.id.slice(0, 8).toUpperCase()}`;

    await adminClient.from("credentials").insert({
      credential_id: credentialId,
      user_id: user.id,
      course_id: courseId,
      enrollment_id: enrollment.id,
      issued_at: new Date().toISOString(),
    });

    await adminClient
      .from("enrollments")
      .update({ status: "completed" })
      .eq("id", enrollment.id);
  }

  redirect(`/courses/${courseId}/exam/results/${attempt.id}`);
}
