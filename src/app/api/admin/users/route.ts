import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getFreshUserRole, type UserRole } from "@/lib/auth-helpers";
import { ilike, or, eq, desc, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getFreshUserRole(session.user.discordId);
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const filterRole = searchParams.get("role")?.trim();

  const conditions = [];

  if (search) {
    conditions.push(
      or(
        ilike(users.username, `%${search}%`),
        ilike(users.discordId, `%${search}%`),
      ),
    );
  }

  if (filterRole && filterRole !== "all") {
    conditions.push(eq(users.role, filterRole as UserRole));
  }

  try {
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
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(users.createdAt));

    return NextResponse.json({ users: userList });
  } catch (err) {
    console.error("Error fetching admin users:", err);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
