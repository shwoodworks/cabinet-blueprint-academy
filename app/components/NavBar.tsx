import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";

export async function NavBar() {
  const user = await getCurrentUser();

  return (
    <header className="flex items-center justify-between border-b border-neutral-200 px-6 py-3">
      <Link href="/" className="font-semibold">
        Cabinet Blueprint Academy
      </Link>

      {user && (
        <nav className="flex items-center gap-4 text-sm">
          {user.role === "admin" && <Link href="/admin/courses">Admin</Link>}
          {user.role === "employer" && <Link href="/employer/roster">Roster</Link>}
          {user.role === "learner" && <Link href="/courses">My Courses</Link>}
          <span className="text-neutral-500">{user.full_name}</span>
          <form action={signOut}>
            <button type="submit" className="text-neutral-500 hover:text-neutral-900">
              Sign out
            </button>
          </form>
        </nav>
      )}
    </header>
  );
}
