import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/app/components/PrintButton";
import { OnePagerDocument } from "@/app/components/OnePagerDocument";
import type { Course } from "@/lib/types/database";

export default async function OnePagerPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const user = await requireRole("learner");
  const { courseId } = await params;
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .eq("is_published", true)
    .single();
  if (!course) notFound();
  const typedCourse = course as Course;

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .single();
  if (!enrollment) redirect("/courses");

  const { data: credential } = await supabase
    .from("credentials")
    .select("credential_id, issued_at")
    .eq("enrollment_id", enrollment.id)
    .eq("course_id", courseId)
    .order("issued_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!credential) redirect(`/courses/${courseId}`);

  const issuedDate = new Date(credential.issued_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <main className="flex flex-1 flex-col items-center gap-6 bg-neutral-100 px-4 py-10 print:block print:bg-white print:p-0">
        <div className="print:hidden flex w-full max-w-2xl items-center justify-between">
          <Link href={`/courses/${courseId}/certificate`} className="text-sm text-neutral-500">
            ← Certificate
          </Link>
          <PrintButton />
        </div>

        <OnePagerDocument
          courseTitle={typedCourse.title}
          credentialId={credential.credential_id}
          issuedDate={issuedDate}
        />
      </main>

      <style>{`
        @media print {
          @page {
            margin: 0.5in;
          }
          body {
            margin: 0 !important;
          }
          main {
            display: block !important;
            padding: 0 !important;
          }
          #one-pager {
            margin: 0 auto !important;
            border: none !important;
          }
        }
      `}</style>
    </>
  );
}
