import Link from "next/link";
import Image from "next/image";
import { type UserRole } from "@/lib/auth-helpers";
import { signOut } from "@/auth";

interface NavbarProps {
  user: {
    id: string;
    name?: string | null;
    avatar?: string | null;
    discordId: string;
    role: UserRole;
  };
}

const roleBadgeColor: Record<UserRole, string> = {
  admin: "bg-purple-100 text-purple-800 border-purple-200",
  pm: "bg-blue-100 text-blue-800 border-blue-200",
  qa: "bg-green-100 text-green-800 border-green-200",
  be: "bg-emerald-100 text-emerald-800 border-emerald-200",
  fe: "bg-teal-100 text-teal-800 border-teal-200",
  ai: "bg-indigo-100 text-indigo-800 border-indigo-200",
  devops: "bg-orange-100 text-orange-800 border-orange-200",
  inactive: "bg-gray-100 text-gray-700 border-gray-200",
};

export function Navbar({ user }: NavbarProps) {
  return (
    <nav className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white shadow-sm">
              TK
            </span>
            <span className="font-bold text-gray-900">Ticketing IT</span>
          </Link>

          <div className="hidden space-x-6 sm:flex">
            <Link
              href="/"
              className="text-sm font-medium text-gray-700 hover:text-blue-600"
            >
              Dashboard
            </Link>
            <Link
              href="/tickets"
              className="text-sm font-medium text-gray-700 hover:text-blue-600"
            >
              Tiket
            </Link>
            <Link
              href="/projects"
              className="text-sm font-medium text-gray-700 hover:text-blue-600"
            >
              Project
            </Link>
            {user.role === "admin" && (
              <Link
                href="/admin/users"
                className="text-sm font-medium text-gray-700 hover:text-blue-600"
              >
                Pengguna & Role
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            {user.avatar ? (
              <Image
                src={user.avatar}
                alt=""
                width={32}
                height={32}
                unoptimized
                className="h-8 w-8 rounded-full border border-gray-200"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-700">
                {user.name ? user.name[0].toUpperCase() : "U"}
              </div>
            )}
            <div className="hidden text-left sm:block">
              <div className="text-xs font-semibold text-gray-900">
                {user.name || "Discord User"}
              </div>
              <span
                className={`inline-flex items-center rounded-full border px-1.5 py-0.2 text-[10px] font-semibold uppercase ${
                  roleBadgeColor[user.role]
                }`}
              >
                {user.role}
              </span>
            </div>
          </div>

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
            >
              Keluar
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
