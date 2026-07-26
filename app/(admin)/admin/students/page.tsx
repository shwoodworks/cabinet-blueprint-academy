import { getAdminStudentsData } from "@/lib/admin-data";
import { inviteStudent } from "@/app/actions/admin";

export default async function AdminStudentsPage() {
  const { courses, students, enrollments } = await getAdminStudentsData();

  const enrollmentsByUser = new Map<string, { courseId: string; status: string }[]>();
  for (const e of enrollments) {
    const list = enrollmentsByUser.get(e.user_id) ?? [];
    list.push({ courseId: e.course_id, status: e.status });
    enrollmentsByUser.set(e.user_id, list);
  }
  const courseTitleById = new Map(courses.map((c) => [c.id, c.title]));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10">
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
            const courseList = enrollmentsByUser.get(s.id) ?? [];
            return (
              <li
                key={s.id}
                className="rounded-lg border border-neutral-200 bg-white px-4 py-3"
              >
                <p className="font-medium text-navy">{s.full_name}</p>
                <p className="text-sm text-neutral-500">{s.email}</p>
                {courseList.length > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {courseList.map((e) => (
                      <li
                        key={e.courseId}
                        className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600"
                      >
                        {courseTitleById.get(e.courseId) ?? "Course"} ·{" "}
                        {e.status === "completed" ? "Completed" : "In progress"}
                      </li>
                    ))}
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
