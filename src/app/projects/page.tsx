import { auth } from "@/auth";
import { db } from "@/db";
import { projects, users, tickets } from "@/db/schema";
import { getFreshUserRole } from "@/lib/auth-helpers";
import { desc, eq, sql, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ProjectList } from "./project-list";
import { Navbar } from "@/components/navbar";

export default async function ProjectsPage() {
  const session = await auth();

  if (!session?.user?.discordId) {
    redirect("/login");
  }

  const role = await getFreshUserRole(session.user.discordId);
  if (!role || role === "inactive") {
    redirect("/waiting-activation");
  }

  // 1. Fetch all projects with owner username
  const rawProjects = await db
    .select({
      id: projects.id,
      code: projects.code,
      name: projects.name,
      description: projects.description,
      ownerId: projects.ownerId,
      ownerName: users.username,
      discordChannelId: projects.discordChannelId,
      isActive: projects.isActive,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .leftJoin(users, eq(projects.ownerId, users.id))
    .orderBy(desc(projects.createdAt));

  // 2. Fetch ticket counts per project
  const ticketCounts = await db
    .select({
      projectId: tickets.projectId,
      count: sql<number>`count(*)::int`,
    })
    .from(tickets)
    .groupBy(tickets.projectId);

  const countMap = new Map<string, number>();
  ticketCounts.forEach((tc) => {
    countMap.set(tc.projectId, tc.count);
  });

  const serializedProjects = rawProjects.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    ticketCount: countMap.get(p.id) ?? 0,
  }));

  // 3. Fetch active users list for owner dropdown
  const activeUsers = await db
    .select({
      id: users.id,
      username: users.username,
    })
    .from(users)
    .where(ne(users.role, "inactive"))
    .orderBy(users.username);

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
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Master Data Project
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Kelola data project, kode prefix tiket, PIC project, dan konfigurasi channel Discord notifikasi.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ProjectList
          initialProjects={serializedProjects}
          currentRole={role}
          usersList={activeUsers}
        />
      </main>
    </div>
  );
}
