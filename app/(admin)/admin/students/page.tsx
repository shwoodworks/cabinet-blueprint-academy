import Link from "next/link";
import { getAdminStudentsData } from "@/lib/admin-data";
import { inviteStudent } from "@/app/actions/admin";

export default async function AdminStudentsPage() {
  const {
    courses,
    students,
    enrollments,
    modules,
    moduleProgress,
    examAssessments,
    examAttempts,
    credentials,
  } = await getAdminStudentsData();

  const courseTitleById = new Map(courses.map((c) => [c.id, c.title]));

  const totalModulesByCourse = new Map<string, number>();
  for (const m of modules) {
    totalModulesByCourse.set(m.course_id, (totalModulesByCourse.get(m.course_id) ?? 0) + 1);
  }

  const examAssessmentByCourse = new Map(examAssessments.map((a) => [a.course_id, a.id]));
  const credentialByEnrollment = new Map(credentials.map((c) => [c.enrollment_id, c]));

  const enrollmentsByUser = new Map<string, typeof enrollments>();
  for (const e of enrollments) {
    const list = enrollmentsByUser.get(e.user_id) ?? [];
    list.push(e);
    enrollmentsByUser.set(e.user_id, list);
  }

  function getModuleCompleteCount(enrollmentId: string) {
    return moduleProgress.filter(
      (mp) => mp.enrollment_id === enrollmentId && mp.status === "completed"
    ).length;
  }

  function getExamStatus(userId: string, courseId: string) {
    const assessmentId = examAssessmentByCourse.get(courseId);
    if (!assessmentId) return "No final exam";
    const attempts = examAttempts.filter(
      (a) => a.assessment_id === assessmentId && a.user_id === userId
    );
    if (attempts.length === 0) return "Not started";
    const passed = attempts.find((a) => a.passed);
    if (passed) return `Passed (${passed.score_pct}%)`;
    return `Failed — ${attempts.length} attempt${attempts.length > 1 ? "s" : ""}`;
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gold">Admin</p>
        <h1 className="mt-1 font-serif text-2xl font-bold text-navy">Students</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Invite a new student and see who&apos;s enrolled.
        </p>
      </div>

      <form
        action={inviteStudent}
        className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm"
      >
        <h2 className="font-serif text-lg font-semibold text-navy">Invite a student</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Full name
            <input
              name="full_name"
              required
              className="rounded border border-neutral-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              name="email"
              type="email"
              required
              className="rounded border border-neutral-300 px-3 py-2"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Course
          <select
            name="course_id"
            required
            defaultValue=""
            className="rounded border border-neutral-300 px-3 py-2"
          >
            <option value="" disabled>
              Select a course
            </option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="self-start rounded bg-gold px-4 py-2 text-sm font-semibold text-navy hover:opacity-90"
        >
          Send invite
        </button>
        <p className="text-xs text-neutral-500">
          They&apos;ll get an email with a link to set their password and start the course.
        </p>
      </form>

      <div>
        <h2 className="font-serif text-lg font-semibold text-navy">Current students</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {students.map((s) => {
            const studentEnrollments = enrollmentsByUser.get(s.id) ?? [];
            return (
              <li
                key={s.id}
                className="rounded-lg border border-neutral-200 bg-white px-4 py-3"
              >
                <p className="font-medium text-navy">{s.full_name}</p>
                <p className="text-sm text-neutral-500">{s.email}</p>
                {studentEnrollments.length > 0 ? (
                  <ul className="mt-2 flex flex-col gap-2">
                    {studentEnrollments.map((e) => {
                      const totalModules = totalModulesByCourse.get(e.course_id) ?? 0;
                      const completeModules = getModuleCompleteCount(e.id);
                      const examStatus = getExamStatus(s.id, e.course_id);
                      const credential = credentialByEnrollment.get(e.id);
                      return (
                        <li
                          key={e.course_id}
                          className="rounded border border-neutral-100 bg-neutral-50 px-3 py-2 text-sm"
                        >
                          <p className="font-medium text-neutral-700">
                            {courseTitleById.get(e.course_id) ?? "Course"}
                          </p>
                          <p className="text-neutral-500">
                            Modules: {completeModules}/{totalModules} &middot; Final exam:{" "}
                            {examStatus}
                          </p>
                          {credential && !credential.revoked_at ? (
                            <Link
                              href={`/admin/students/${s.id}/certificate?courseId=${e.course_id}`}
                              className="mt-1 inline-block text-xs font-medium text-gold hover:underline"
                            >
                              View certificate ({credential.credential_id})
                            </Link>
                          ) : (
                            <p className="mt-1 text-xs text-neutral-400">No certificate yet</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs text-neutral-400">Not enrolled in any course</p>
                )}
              </li>
            );
          })}
          {students.length === 0 && (
            <p className="text-sm text-neutral-500">No students yet.</p>
          )}
        </ul>
      </div>
    </main>
  );
}
