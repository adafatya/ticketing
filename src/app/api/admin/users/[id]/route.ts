import { auth } from "@/auth";
import { db } from "@/db";
import { users, userRoleEvents } from "@/db/schema";
import { getFreshUserRole } from "@/lib/auth-helpers";
import { canUpdateUserRole, validateRoleUpdateInput } from "@/lib/user-management";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminRole = await getFreshUserRole(session.user.discordId);
  if (adminRole !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
  }

  const { id: targetUserId } = await params;
  const body = await request.json();
  const validation = validateRoleUpdateInput(body);

  if (!validation.valid || !validation.data) {
    return NextResponse.json({ error: validation.error || "Input role tidak valid" }, { status: 400 });
  }

  const newRole = validation.data.role;

  try {
    // 1. Fetch current target user
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
    }

    // 2. Fetch current admin user info for audit log
    const [currentAdminUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.discordId, session.user.discordId))
      .limit(1);

    // 3. Count total active admins if changing an admin
    let adminCount = 0;
    if (targetUser.role === "admin") {
      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.role, "admin"));
      adminCount = countResult?.count ?? 0;
    }

    // 4. Verify last admin protection
    const roleCheck = canUpdateUserRole({
      currentRole: targetUser.role,
      newRole,
      adminCount,
    });

    if (!roleCheck.allowed) {
      return NextResponse.json({ error: roleCheck.error }, { status: 400 });
    }

    // 5. Update user role and log event
    const [updatedUser] = await db
      .update(users)
      .set({ role: newRole })
      .where(eq(users.id, targetUserId))
      .returning();

    await db.insert(userRoleEvents).values({
      userId: targetUserId,
      changedBy: currentAdminUser?.id ?? null,
      fromRole: targetUser.role,
      toRole: newRole,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        discordId: updatedUser.discordId,
        username: updatedUser.username,
        role: updatedUser.role,
      },
    });
  } catch (err) {
    console.error("Error updating user role:", err);
    return NextResponse.json({ error: "Gagal memperbarui role pengguna" }, { status: 500 });
  }
}
