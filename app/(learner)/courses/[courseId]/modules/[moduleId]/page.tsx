import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { markModuleComplete } from "@/app/actions/learner";
import type { Assessment, CourseModule, Material } from "@/lib/types/database";

export default async function LearnerModuleDetailPage({
  params,
}: {
  params: Promise<{ courseId: string; moduleId: string }>;
}) {
  const user = await requireRole("learner");
  const { courseId, moduleId } = await params;
  const supabase = await createClient();

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .single();

  if (!enrollment) redirect("/courses");

  const { data: mod } = await supabase
    .from("modules")
    .select("*")
    .eq("id", moduleId)
    .eq("is_published", true)
    .single();

  if (!mod) notFound();

  const { data: materials } = await supabase
    .from("materials")
    .select("*")
    .eq("module_id", moduleId)
    .order("sequence_order", { ascending: true });

  const { data: progressRow } = await supabase
    .from("module_progress")
    .select("status")
    .eq("enrollment_id", enrollment.id)
    .eq("module_id", moduleId)
    .single();

  const typedModule = mod as CourseModule;
  const typedMaterials = (materials ?? []) as Material[];
  const completed = progressRow?.status === "completed";

  const { data: assessment } = await supabase
    .from("assessments")
    .select("*")
    .eq("module_id", moduleId)
    .eq("scope", "module_quiz")
    .maybeSingle();
  const typedAssessment = assessment as Assessment | null;

  let attemptsUsed = 0;
  if (typedAssessment) {
    const { count } = await supabase
      .from("assessment_attempts")
      .select("id", { count: "exact", head: true })
      .eq("assessment_id", typedAssessment.id)
      .eq("user_id", user.id);
    attemptsUsed = count ?? 0;
  }
  const attemptsExhausted =
    !!typedAssessment && typedAssessment.max_attempts != null && attemptsUsed >= typedAssessment.max_attempts;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <Link href={`/courses/${courseId}`} className="text-sm text-neutral-500">
        ← Course
      </Link>

      <h1 className="text-xl font-semibold">{typedModule.title}</h1>

      <div className="flex flex-col gap-4">
        {typedMaterials.map((material) => (
          <div key={material.id} className="rounded border border-neutral-200 p-4">
            {material.type === "text" && (
              <p className="whitespace-pre-wrap text-sm">{material.body}</p>
            )}
            {material.type === "image" && material.file_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={material.file_url} alt="" className="max-w-full rounded" />
            )}
            {material.type === "pdf" && material.file_url && (
              <a href={material.file_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                View PDF
              </a>
            )}
          </div>
        ))}
        {typedMaterials.length === 0 && (
          <p className="text-sm text-neutral-500">No materials yet.</p>
        )}
      </div>

      {completed ? (
        <p className="text-sm font-medium text-green-700">Module completed.</p>
      ) : typedAssessment ? (
        attemptsExhausted ? (
          <p className="text-sm text-neutral-600">
            No attempts remaining — contact your admin to reset the quiz.
          </p>
        ) : (
          <Link
            href={`/courses/${courseId}/modules/${moduleId}/quiz`}
            className="inline-block rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            {attemptsUsed > 0 ? "Retake quiz" : "Take quiz"}
          </Link>
        )
      ) : (
        <form action={markModuleComplete.bind(null, courseId, moduleId)}>
          <button
            type="submit"
            className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            Mark module complete
          </button>
        </form>
      )}
    </main>
  );
}
