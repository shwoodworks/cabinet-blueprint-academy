import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PrintButton } from "@/app/components/PrintButton";
import { CertificateDocument } from "@/app/components/CertificateDocument";

export default async function AdminStudentCertificatePage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ courseId?: string }>;
}) {
  await requireRole("admin");
  const { userId } = await params;
  const { courseId } = await searchParams;
  if (!courseId) notFound();

  const adminClient = createAdminClient();

  const { data: student } = await adminClient
    .from("users")
    .select("full_name")
    .eq("id", userId)
    .single();
  if (!student) notFound();

  const { data: course } = await adminClient
    .from("courses")
    .select("id, title")
    .eq("id", courseId)
    .single();
  if (!course) notFound();

  const { data: enrollment } = await adminClient
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .single();
  if (!enrollment) redirect("/admin/students");

  const { data: credential } = await adminClient
    .from("credentials")
    .select("credential_id, issued_at")
    .eq("enrollment_id", enrollment.id)
    .eq("course_id", courseId)
    .order("issued_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!credential) redirect("/admin/students");

  const issuedDate = new Date(credential.issued_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap"
      />
      <main className="flex flex-1 flex-col items-center gap-6 bg-neutral-100 px-4 py-10 print:block print:bg-white print:p-0">
        <div className="print:hidden flex w-full max-w-4xl items-center justify-between">
          <Link href="/admin/students" className="text-sm text-neutral-500">
            ← Students
          </Link>
          <PrintButton />
        </div>

        <CertificateDocument
          fullName={student.full_name}
          courseTitle={course.title}
          issuedDate={issuedDate}
          credentialId={credential.credential_id}
        />
      </main>

      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 0.25in;
          }
          body {
            margin: 0 !important;
          }
          main {
            display: block !important;
            padding: 0 !important;
          }
          #certificate {
            margin: 0 auto !important;
          }
        }
      `}</style>
    </>
  );
}
