import { auth } from "@/auth";
import { db } from "@/db";
import { projects, users } from "@/db/schema";
import { getFreshUserRole } from "@/lib/auth-helpers";
import { validateProjectInput } from "@/lib/project-management";
import { eq, ilike, or, and, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getFreshUserRole(session.user.discordId);
  if (!role || role === "inactive") {
    return NextResponse.json({ error: "Forbidden: Akun belum diaktifkan" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const statusParam = searchParams.get("status")?.trim(); // 'active' | 'inactive' | 'all'

  const conditions = [];

  if (search) {
    conditions.push(
      or(
        ilike(projects.name, `%${search}%`),
        ilike(projects.code, `%${search}%`),
      ),
    );
  }

  if (statusParam === "active") {
    conditions.push(eq(projects.isActive, true));
  } else if (statusParam === "inactive") {
    conditions.push(eq(projects.isActive, false));
  } else if (!statusParam && role !== "admin" && role !== "pm") {
    // Non-management roles default to active projects only
    conditions.push(eq(projects.isActive, true));
  }

  try {
    const projectList = await db
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
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(projects.createdAt));

    return NextResponse.json({ projects: projectList });
  } catch (err) {
    console.error("Error fetching projects:", err);
    return NextResponse.json({ error: "Gagal memuat daftar project" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getFreshUserRole(session.user.discordId);
  if (role !== "admin" && role !== "pm") {
    return NextResponse.json(
      { error: "Forbidden: Hanya Admin dan PM yang dapat membuat project" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const validation = validateProjectInput(body);

  if (!validation.valid || !validation.data) {
    return NextResponse.json(
      { error: validation.error || "Data project tidak valid" },
      { status: 400 },
    );
  }

  const { code, name, description, ownerId, discordChannelId, isActive } = validation.data;

  try {
    // 1. Check uniqueness of project code
    const [existing] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.code, code))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: `Project dengan kode '${code}' sudah ada. Gunakan kode unik lain.` },
        { status: 409 },
      );
    }

    // 2. Insert new project
    const [newProject] = await db
      .insert(projects)
      .values({
        code,
        name,
        description: description || null,
        ownerId: ownerId || null,
        discordChannelId: discordChannelId || null,
        isActive: isActive !== undefined ? isActive : true,
      })
      .returning();

    return NextResponse.json({ success: true, project: newProject }, { status: 201 });
  } catch (err) {
    console.error("Error creating project:", err);
    return NextResponse.json({ error: "Gagal membuat project baru" }, { status: 500 });
  }
}
