import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";

export async function getAdminStudentsData() {
  await requireRole("admin");
  const adminClient = createAdminClient();

  const { data: courses } = await adminClient
    .from("courses")
    .select("id, title")
    .order("created_at", { ascending: false });

  const { data: students } = await adminClient
    .from("users")
    .select("id, email, full_name, created_at")
    .eq("role", "learner")
    .order("created_at", { ascending: false });

  const { data: enrollments } = await adminClient
    .from("enrollments")
    .select("id, user_id, course_id, status, enrolled_at");

  const { data: modules } = await adminClient
    .from("modules")
    .select("id, course_id")
    .eq("is_published", true);

  const { data: moduleProgress } = await adminClient
    .from("module_progress")
    .select("enrollment_id, module_id, status");

  const { data: examAssessments } = await adminClient
    .from("assessments")
    .select("id, course_id")
    .eq("scope", "final_exam");

  const { data: examAttempts } = await adminClient
    .from("assessment_attempts")
    .select("assessment_id, user_id, passed, score_pct, submitted_at")
    .order("submitted_at", { ascending: false });

  const { data: credentials } = await adminClient
    .from("credentials")
    .select("credential_id, user_id, course_id, enrollment_id, issued_at, revoked_at")
    .order("issued_at", { ascending: false });

  return {
    courses: courses ?? [],
    students: students ?? [],
    enrollments: enrollments ?? [],
    modules: modules ?? [],
    moduleProgress: moduleProgress ?? [],
    examAssessments: examAssessments ?? [],
    examAttempts: examAttempts ?? [],
    credentials: credentials ?? [],
  };
}
