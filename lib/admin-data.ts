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
    .select("user_id, course_id, status, enrolled_at");

  return {
    courses: courses ?? [],
    students: students ?? [],
    enrollments: enrollments ?? [],
  };
}
