import { z } from "zod";
import { userRoleEnum } from "@/db/schema";
import { type UserRole } from "@/lib/auth-helpers";

export const userRoleSchema = z.enum(userRoleEnum.enumValues);

export const roleUpdateSchema = z.object({
  role: userRoleSchema,
});

export const preRegisterUserSchema = z.object({
  discordId: z.string().trim().min(1, "Discord ID tidak boleh kosong"),
  role: userRoleSchema,
  username: z.string().trim().optional(),
});

export interface CanUpdateRoleParams {
  currentRole: UserRole;
  newRole: UserRole;
  adminCount: number;
}

export interface CanUpdateRoleResult {
  allowed: boolean;
  error?: string;
}

export function canUpdateUserRole({
  currentRole,
  newRole,
  adminCount,
}: CanUpdateRoleParams): CanUpdateRoleResult {
  // If user is currently admin and being changed to a non-admin role:
  if (currentRole === "admin" && newRole !== "admin") {
    if (adminCount <= 1) {
      return {
        allowed: false,
        error:
          "Sistem menolak mengubah atau menonaktifkan Admin terakhir. Harus ada minimal satu Admin yang aktif.",
      };
    }
  }

  return { allowed: true };
}

export function validateRoleUpdateInput(input: unknown): {
  valid: boolean;
  data?: z.infer<typeof roleUpdateSchema>;
  error?: string;
} {
  const result = roleUpdateSchema.safeParse(input);
  if (!result.success) {
    return {
      valid: false,
      error: result.error.errors.map((e) => e.message).join(", "),
    };
  }
  return { valid: true, data: result.data };
}

export function validatePreRegisterInput(input: unknown): {
  valid: boolean;
  data?: z.infer<typeof preRegisterUserSchema>;
  error?: string;
} {
  const result = preRegisterUserSchema.safeParse(input);
  if (!result.success) {
    return {
      valid: false,
      error: result.error.errors.map((e) => e.message).join(", "),
    };
  }
  return { valid: true, data: result.data };
}
