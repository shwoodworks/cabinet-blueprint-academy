import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";

export async function NavBar() {
  const user = await getCurrentUser();

  return (
    <header className="flex items-center justify-between border-b border-neutral-800 bg-navy px-6 py-4">
      <Link href="/" className="font-serif text-lg font-bold tracking-wide text-gold">
        Cabinet Blueprint Academy
      </Link>

      {user && (
        <nav className="flex items-center gap-4 text-sm text-neutral-200">
          {user.role === "admin" && (
            <>
              <Link href="/admin/courses" className="hover:text-white">
                Courses
              </Link>
              <Link href="/admin/students" className="hover:text-white">
                Students
              </Link>
            </>
          )}
          {user.role === "employer" && (
            <Link href="/employer/roster" className="hover:text-white">
              Roster
            </Link>
          )}
          {user.role === "learner" && (
            <Link href="/courses" className="hover:text-white">
              My Courses
            </Link>
          )}
          <span className="text-neutral-400">{user.full_name}</span>
          <form action={signOut}>
            <button type="submit" className="text-neutral-400 hover:text-white">
              Sign out
            </button>
          </form>
        </nav>
      )}
    </header>
  );
}
