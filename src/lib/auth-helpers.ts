import { userRoleEnum } from "@/db/schema";

export type UserRole = (typeof userRoleEnum.enumValues)[number];

export function checkIsInitialAdmin(
  discordId: string,
  adminDiscordIds?: string,
): boolean {
  if (!adminDiscordIds || !discordId) return false;
  const adminIds = adminDiscordIds
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return adminIds.includes(discordId.trim());
}

export interface ResolveUserParams {
  existingUser: {
    id: string;
    discordId: string;
    role: UserRole;
  } | null;
  discordId: string;
  adminDiscordIds?: string;
}

export interface ResolveUserResult {
  role: UserRole;
  isNew: boolean;
}

export function resolveUserOnLogin({
  existingUser,
  discordId,
  adminDiscordIds,
}: ResolveUserParams): ResolveUserResult {
  if (existingUser) {
    return {
      role: existingUser.role,
      isNew: false,
    };
  }

  const isInitialAdmin = checkIsInitialAdmin(discordId, adminDiscordIds);
  return {
    role: isInitialAdmin ? "admin" : "inactive",
    isNew: true,
  };
}
