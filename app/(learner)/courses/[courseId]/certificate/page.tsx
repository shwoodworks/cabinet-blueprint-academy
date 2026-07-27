import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/app/components/PrintButton";
import type { Course } from "@/lib/types/database";

export default async function CertificatePage({
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
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap"
      />
      <main className="flex flex-1 flex-col items-center gap-6 bg-neutral-100 px-4 py-10 print:bg-white print:py-0">
        <div className="print:hidden flex w-full max-w-4xl items-center justify-between">
          <Link href={`/courses/${courseId}`} className="text-sm text-neutral-500">
            ← {typedCourse.title}
          </Link>
          <PrintButton />
        </div>

        <div
          id="certificate"
          className="relative flex w-full max-w-4xl flex-col overflow-hidden bg-white shadow-xl print:aspect-auto print:w-full print:shadow-none"
          style={{
            aspectRatio: "1.294 / 1",
            border: "10px solid #0a1f34",
            outline: "2px solid #c88d3d",
            outlineOffset: "-16px",
          }}
        >
          {/* Curved navy header band */}
          <div
            className="relative flex shrink-0 items-center justify-center bg-navy"
            style={{ height: "22%" }}
          >
            <div
              className="absolute inset-x-0 bottom-0 bg-white"
              style={{
                height: "26px",
                borderRadius: "50% 50% 0 0 / 100% 100% 0 0",
                transform: "scale(1.4, 1)",
              }}
            />
            <p
              className="relative z-10 font-serif text-xl font-bold tracking-[0.15em] text-gold sm:text-2xl"
              style={{ marginBottom: "26px" }}
            >
              CABINET BLUEPRINT ACADEMY
            </p>
          </div>

          <div className="flex flex-1 flex-col items-center justify-between px-8 py-6 text-center sm:px-16 sm:py-8">
            <div className="flex flex-col items-center gap-3">
              <h1
                className="text-navy"
                style={{ fontFamily: "'Dancing Script', cursive", fontSize: "2.75rem", lineHeight: 1 }}
              >
                Certificate of Completion
              </h1>

              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500">
                This acknowledges that
              </p>

              <p className="font-serif text-3xl font-bold text-navy sm:text-4xl">{user.full_name}</p>

              <p className="max-w-xl text-sm text-neutral-600 sm:text-base">
                has successfully completed the <strong>{typedCourse.title}</strong> and is certified
                as a <strong>Cabinet Blueprint Certified Installer</strong>.
              </p>

              <p className="text-sm font-medium text-neutral-500">Issued {issuedDate}</p>
            </div>

            <div className="mt-6 flex w-full items-end justify-between">
              <div className="flex flex-col items-start">
                <p
                  className="text-navy"
                  style={{ fontFamily: "'Dancing Script', cursive", fontSize: "1.5rem" }}
                >
                  Stephen Harness
                </p>
                <div className="mt-1 w-40 border-t border-neutral-400 sm:w-48" />
                <p className="mt-1 text-xs font-medium text-neutral-600">Founder</p>
                <p className="text-xs text-neutral-500">Cabinet Blueprint Academy</p>
              </div>

              <div
                className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full text-center sm:h-24 sm:w-24"
                style={{
                  background:
                    "radial-gradient(circle at 35% 30%, #e6b869, #c88d3d 55%, #9c6c26 100%)",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                }}
              >
                <span className="text-[9px] font-bold uppercase tracking-wide text-navy">
                  Certified
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wide text-navy">
                  Installer
                </span>
              </div>

              <div className="flex flex-col items-end text-right">
                <p className="text-xs font-medium text-neutral-600">
                  Credential ID: {credential.credential_id}
                </p>
                <p className="text-xs text-neutral-500">
                  Verify at cabinet-blueprint-academy.vercel.app/verify
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 0.25in;
          }
        }
      `}</style>
    </>
  );
}
