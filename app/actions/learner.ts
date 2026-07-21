"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export async function enrollInCourse(courseId: string) {
  const user = await requireRole("learner");
  const supabase = await createClient();

  // Self-enrollment is only allowed for learners with no organization —
  // org-affiliated learners are enrolled by their org/admin instead.
  if (user.organization_id) throw new Error("Enrollment is managed by your organization");

  const { error } = await supabase
    .from("enrollments")
    .insert({ user_id: user.id, course_id: courseId, organization_id: null })
    .select("id")
    .single();

  if (error && !error.message.includes("duplicate")) throw new Error(error.message);

  revalidatePath("/courses");
  revalidatePath(`/courses/${courseId}`);
}

export async function markModuleComplete(courseId: string, moduleId: string) {
  const user = await requireRole("learner");
  const supabase = await createClient();

  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .single();

  if (enrollmentError || !enrollment) throw new Error("Not enrolled in this course");

  const { error } = await supabase.from("module_progress").upsert(
    {
      enrollment_id: enrollment.id,
      module_id: moduleId,
      status: "completed",
      completed_at: new Date().toISOString(),
    },
    { onConflict: "enrollment_id,module_id" }
  );

  if (error) throw new Error(error.message);

  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}/modules/${moduleId}`);
}
