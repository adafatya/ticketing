import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getFreshUserRole } from "@/lib/auth-helpers";
import { desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { UserTable } from "./user-table";
import { Navbar } from "@/components/navbar";

export default async function AdminUsersPage() {
  const session = await auth();

  if (!session?.user?.discordId) {
    redirect("/login");
  }

  const role = await getFreshUserRole(session.user.discordId);
  if (role !== "admin") {
    redirect("/");
  }

  const userList = await db
    .select({
      id: users.id,
      discordId: users.discordId,
      username: users.username,
      avatar: users.avatar,
      email: users.email,
      role: users.role,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  const serializedUsers = userList.map((u) => ({
    ...u,
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        user={{
          id: session.user.id || "",
          name: session.user.name,
          avatar: session.user.image,
          discordId: session.user.discordId,
          role,
        }}
      />

      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Manajemen Pengguna & Role</h1>
            <p className="text-xs text-gray-500">Kelola role tim IT internal dan lakukan pra-registrasi.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-purple-700 bg-purple-100 px-2.5 py-1 rounded-full border border-purple-200">
              Admin: {session.user.name || session.user.discordId}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <UserTable initialUsers={serializedUsers} />
      </main>
    </div>
  );
}
