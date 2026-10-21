import { auth } from "@/auth";
import { db } from "@/db";
import { users, userRoleEvents } from "@/db/schema";
import { getFreshUserRole } from "@/lib/auth-helpers";
import { validatePreRegisterInput } from "@/lib/user-management";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminRole = await getFreshUserRole(session.user.discordId);
  if (adminRole !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
  }

  const body = await request.json();
  const validation = validatePreRegisterInput(body);

  if (!validation.valid || !validation.data) {
    return NextResponse.json(
      { error: validation.error || "Data pra-registrasi tidak valid" },
      { status: 400 },
    );
  }

  const { discordId, role, username } = validation.data;

  try {
    // 1. Check if user already exists
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.discordId, discordId))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Pengguna dengan Discord ID ini sudah terdaftar di sistem" },
        { status: 409 },
      );
    }

    // 2. Fetch current admin user info
    const [currentAdminUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.discordId, session.user.discordId))
      .limit(1);

    // 3. Insert pre-registered user
    const [newUser] = await db
      .insert(users)
      .values({
        discordId,
        username: username || `User (${discordId})`,
        role,
      })
      .returning();

    // 4. Log role event
    await db.insert(userRoleEvents).values({
      userId: newUser.id,
      changedBy: currentAdminUser?.id ?? null,
      fromRole: "inactive",
      toRole: role,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        discordId: newUser.discordId,
        username: newUser.username,
        role: newUser.role,
      },
    });
  } catch (err) {
    console.error("Error pre-registering user:", err);
    return NextResponse.json(
      { error: "Gagal mendaftarkan pengguna baru" },
      { status: 500 },
    );
  }
}
