import { z } from "zod";

export function formatProjectCode(code: string): string {
  return code.trim().toUpperCase();
}

export const projectSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Kode project minimal 2 karakter")
    .max(10, "Kode project maksimal 10 karakter")
    .regex(/^[A-Za-z0-9_-]+$/, "Kode project hanya boleh huruf, angka, dash, dan underscore")
    .transform(formatProjectCode),
  name: z.string().trim().min(1, "Nama project wajib diisi").max(100, "Nama project maksimal 100 karakter"),
  description: z.string().trim().optional(),
  ownerId: z.string().uuid("ID PIC / owner tidak valid").optional().nullable(),
  discordChannelId: z.string().trim().max(64).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updateProjectSchema = projectSchema.partial();

export interface CanUpdateProjectCodeParams {
  currentCode: string;
  newCode: string;
  ticketCount: number;
}

export interface CanUpdateProjectCodeResult {
  allowed: boolean;
  error?: string;
}

export function canUpdateProjectCode({
  currentCode,
  newCode,
  ticketCount,
}: CanUpdateProjectCodeParams): CanUpdateProjectCodeResult {
  const normCurrent = formatProjectCode(currentCode);
  const normNew = formatProjectCode(newCode);

  if (normCurrent !== normNew && ticketCount > 0) {
    return {
      allowed: false,
      error: `Kode project (${normCurrent}) tidak dapat diubah karena sudah memiliki ${ticketCount} tiket terkait.`,
    };
  }

  return { allowed: true };
}

export function validateProjectInput(input: unknown): {
  valid: boolean;
  data?: z.infer<typeof projectSchema>;
  error?: string;
} {
  const result = projectSchema.safeParse(input);
  if (!result.success) {
    return {
      valid: false,
      error: result.error.errors.map((e) => e.message).join(", "),
    };
  }
  return { valid: true, data: result.data };
}

export function validateUpdateProjectInput(input: unknown): {
  valid: boolean;
  data?: z.infer<typeof updateProjectSchema>;
  error?: string;
} {
  const result = updateProjectSchema.safeParse(input);
  if (!result.success) {
    return {
      valid: false,
      error: result.error.errors.map((e) => e.message).join(", "),
    };
  }
  return { valid: true, data: result.data };
}
