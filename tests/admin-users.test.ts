import { describe, it, expect } from "vitest";
import {
  canUpdateUserRole,
  validatePreRegisterInput,
  validateRoleUpdateInput,
} from "@/lib/user-management";
import { type UserRole } from "@/lib/auth-helpers";

describe("User & Role Management Business Logic", () => {
  describe("canUpdateUserRole (Last Admin Protection)", () => {
    it("rejects demoting or deactivating the last remaining admin", () => {
      const result = canUpdateUserRole({
        currentRole: "admin",
        newRole: "inactive",
        adminCount: 1,
      });

      expect(result.allowed).toBe(false);
      expect(result.error).toContain("Admin terakhir");
    });

    it("rejects changing last admin to another role like devops", () => {
      const result = canUpdateUserRole({
        currentRole: "admin",
        newRole: "devops",
        adminCount: 1,
      });

      expect(result.allowed).toBe(false);
      expect(result.error).toContain("Admin terakhir");
    });

    it("allows updating last admin if new role is still admin", () => {
      const result = canUpdateUserRole({
        currentRole: "admin",
        newRole: "admin",
        adminCount: 1,
      });

      expect(result.allowed).toBe(true);
    });

    it("allows demoting an admin if there are multiple admins", () => {
      const result = canUpdateUserRole({
        currentRole: "admin",
        newRole: "pm",
        adminCount: 2,
      });

      expect(result.allowed).toBe(true);
    });

    it("allows changing non-admin users regardless of admin count", () => {
      const result = canUpdateUserRole({
        currentRole: "inactive",
        newRole: "fe",
        adminCount: 1,
      });

      expect(result.allowed).toBe(true);
    });
  });

  describe("validateRoleUpdateInput", () => {
    it("accepts valid roles", () => {
      expect(validateRoleUpdateInput({ role: "pm" }).valid).toBe(true);
      expect(validateRoleUpdateInput({ role: "devops" }).valid).toBe(true);
      expect(validateRoleUpdateInput({ role: "inactive" }).valid).toBe(true);
      expect(validateRoleUpdateInput({ role: "admin" }).valid).toBe(true);
    });

    it("rejects invalid roles", () => {
      const result = validateRoleUpdateInput({ role: "superadmin" as unknown as UserRole });
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("validatePreRegisterInput", () => {
    it("accepts valid discordId and valid role", () => {
      const result = validatePreRegisterInput({
        discordId: "123456789012345678",
        role: "qa",
      });
      expect(result.valid).toBe(true);
    });

    it("rejects empty or invalid discordId", () => {
      expect(validatePreRegisterInput({ discordId: "", role: "qa" }).valid).toBe(false);
      expect(validatePreRegisterInput({ discordId: "   ", role: "qa" }).valid).toBe(false);
    });

    it("rejects invalid role in pre-registration", () => {
      expect(
        validatePreRegisterInput({
          discordId: "123456789012345678",
          role: "invalid" as unknown as UserRole,
        }).valid,
      ).toBe(false);
    });
  });
});
