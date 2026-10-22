import { auth } from "@/auth";
import { db } from "@/db";
import { projects, tickets, users } from "@/db/schema";
import { getFreshUserRole } from "@/lib/auth-helpers";
import {
  canUpdateProjectCode,
  validateUpdateProjectInput,
} from "@/lib/project-management";
import { eq, sql, and, ne } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getFreshUserRole(session.user.discordId);
  if (!role || role === "inactive") {
    return NextResponse.json(
      { error: "Forbidden: Akun belum diaktifkan" },
      { status: 403 },
    );
  }

  const { id } = await params;

  try {
    const [project] = await db
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
      .where(eq(projects.id, id))
      .limit(1);

    if (!project) {
      return NextResponse.json(
        { error: "Project tidak ditemukan" },
        { status: 404 },
      );
    }

    // Get ticket count
    const [ticketCountResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tickets)
      .where(eq(tickets.projectId, id));

    return NextResponse.json({
      project: {
        ...project,
        ticketCount: ticketCountResult?.count ?? 0,
      },
    });
  } catch (err) {
    console.error("Error fetching project:", err);
    return NextResponse.json(
      { error: "Gagal memuat detail project" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getFreshUserRole(session.user.discordId);
  if (role !== "admin" && role !== "pm") {
    return NextResponse.json(
      { error: "Forbidden: Hanya Admin dan PM yang dapat mengubah project" },
      { status: 403 },
    );
  }

  const { id } = await params;
  const body = await request.json();
  const validation = validateUpdateProjectInput(body);

  if (!validation.valid || !validation.data) {
    return NextResponse.json(
      { error: validation.error || "Data update tidak valid" },
      { status: 400 },
    );
  }

  try {
    // 1. Fetch current project
    const [currentProject] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (!currentProject) {
      return NextResponse.json(
        { error: "Project tidak ditemukan" },
        { status: 404 },
      );
    }

    // 2. Count tickets for this project
    const [ticketCountResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tickets)
      .where(eq(tickets.projectId, id));
    const ticketCount = ticketCountResult?.count ?? 0;

    const updateData = validation.data;

    // 3. If code is being changed, check rule and uniqueness
    if (updateData.code && updateData.code !== currentProject.code) {
      const codeCheck = canUpdateProjectCode({
        currentCode: currentProject.code,
        newCode: updateData.code,
        ticketCount,
      });

      if (!codeCheck.allowed) {
        return NextResponse.json({ error: codeCheck.error }, { status: 400 });
      }

      // Check uniqueness among other projects
      const [duplicate] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(eq(projects.code, updateData.code), ne(projects.id, currentProject.id)),
        )
        .limit(1);

      if (duplicate) {
        return NextResponse.json(
          { error: `Kode project '${updateData.code}' sudah digunakan oleh project lain.` },
          { status: 409 },
        );
      }
    }

    // 4. Update the project
    const [updated] = await db
      .update(projects)
      .set({
        ...(updateData.code ? { code: updateData.code } : {}),
        ...(updateData.name ? { name: updateData.name } : {}),
        ...(updateData.description !== undefined
          ? { description: updateData.description || null }
          : {}),
        ...(updateData.ownerId !== undefined ? { ownerId: updateData.ownerId || null } : {}),
        ...(updateData.discordChannelId !== undefined
          ? { discordChannelId: updateData.discordChannelId || null }
          : {}),
        ...(updateData.isActive !== undefined ? { isActive: updateData.isActive } : {}),
      })
      .where(eq(projects.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      project: {
        ...updated,
        ticketCount,
      },
    });
  } catch (err) {
    console.error("Error updating project:", err);
    return NextResponse.json(
      { error: "Gagal memperbarui project" },
      { status: 500 },
    );
  }
}
