"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

async function getModuleCourseId(moduleId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("modules")
    .select("course_id")
    .eq("id", moduleId)
    .single();
  if (error || !data) throw new Error("Module not found");
  return data.course_id as string;
}

export async function upsertAssessment(courseId: string, moduleId: string, formData: FormData) {
  await requireRole("admin");
  const supabase = await createClient();

  const passingScorePct = Number(formData.get("passing_score_pct"));
  const questionCount = Number(formData.get("question_count"));
  const maxAttemptsRaw = String(formData.get("max_attempts") ?? "").trim();
  const maxAttempts = maxAttemptsRaw ? Number(maxAttemptsRaw) : null;

  if (!Number.isFinite(passingScorePct) || passingScorePct < 1 || passingScorePct > 100) {
    throw new Error("Passing score must be between 1 and 100");
  }
  if (!Number.isFinite(questionCount) || questionCount < 1) {
    throw new Error("Question count must be at least 1");
  }

  const { data: existing } = await supabase
    .from("assessments")
    .select("id")
    .eq("module_id", moduleId)
    .eq("scope", "module_quiz")
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("assessments")
      .update({ passing_score_pct: passingScorePct, question_count: questionCount, max_attempts: maxAttempts })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("assessments").insert({
      scope: "module_quiz",
      module_id: moduleId,
      course_id: courseId,
      passing_score_pct: passingScorePct,
      question_count: questionCount,
      max_attempts: maxAttempts,
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/admin/courses/${courseId}/modules/${moduleId}/quiz`);
}

export async function createQuestion(courseId: string, moduleId: string, formData: FormData) {
  await requireRole("admin");
  const supabase = await createClient();

  const prompt = String(formData.get("prompt") ?? "").trim();
  const questionType = String(formData.get("question_type") ?? "single_choice") as
    | "single_choice"
    | "multiple_choice"
    | "true_false";
  const explanation = String(formData.get("explanation") ?? "").trim();

  if (!prompt) throw new Error("Prompt is required");

  const optionCount = Number(formData.get("option_count") ?? 0);
  const options: { label: string; is_correct: boolean }[] = [];

  if (questionType === "multiple_choice") {
    for (let i = 0; i < optionCount; i++) {
      const label = String(formData.get(`option_label_${i}`) ?? "").trim();
      if (!label) continue;
      options.push({ label, is_correct: formData.get(`option_correct_${i}`) === "on" });
    }
  } else {
    const correctIndex = Number(formData.get("correct_index"));
    for (let i = 0; i < optionCount; i++) {
      const label = String(formData.get(`option_label_${i}`) ?? "").trim();
      if (!label) continue;
      options.push({ label, is_correct: i === correctIndex });
    }
  }

  if (options.length < 2) throw new Error("At least two options are required");
  if (!options.some((o) => o.is_correct)) throw new Error("Mark at least one option as correct");

  const { data: question, error: questionError } = await supabase
    .from("questions")
    .insert({
      prompt,
      question_type: questionType,
      explanation: explanation || null,
      scope: "module_quiz",
      module_id: moduleId,
      course_id: courseId,
    })
    .select("id")
    .single();

  if (questionError) throw new Error(questionError.message);

  const { error: optionsError } = await supabase.from("answer_options").insert(
    options.map((o, i) => ({
      question_id: question.id,
      label: o.label,
      is_correct: o.is_correct,
      sequence_order: i + 1,
    }))
  );

  if (optionsError) throw new Error(optionsError.message);

  revalidatePath(`/admin/courses/${courseId}/modules/${moduleId}/quiz`);
}

export async function setQuestionActive(questionId: string, isActive: boolean) {
  await requireRole("admin");
  const supabase = await createClient();

  const { data: question, error: fetchError } = await supabase
    .from("questions")
    .select("module_id")
    .eq("id", questionId)
    .single();
  if (fetchError || !question?.module_id) throw new Error("Question not found");

  const { error } = await supabase.from("questions").update({ is_active: isActive }).eq("id", questionId);
  if (error) throw new Error(error.message);

  const courseId = await getModuleCourseId(question.module_id);
  revalidatePath(`/admin/courses/${courseId}/modules/${question.module_id}/quiz`);
}

export async function resetAttempts(courseId: string, moduleId: string, assessmentId: string, userId: string) {
  await requireRole("admin");
  const supabase = await createClient();

  const { error } = await supabase
    .from("assessment_attempts")
    .delete()
    .eq("assessment_id", assessmentId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  const { error: progressError } = await supabase
    .from("module_progress")
    .update({ status: "in_progress", completed_at: null })
    .eq("module_id", moduleId)
    .in(
      "enrollment_id",
      (
        await supabase.from("enrollments").select("id").eq("user_id", userId).eq("course_id", courseId)
      ).data?.map((e) => e.id) ?? []
    );
  if (progressError) throw new Error(progressError.message);

  revalidatePath(`/admin/courses/${courseId}/modules/${moduleId}/quiz`);
}
