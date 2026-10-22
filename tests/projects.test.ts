import { describe, it, expect } from "vitest";
import {
  canUpdateProjectCode,
  validateProjectInput,
  validateUpdateProjectInput,
  formatProjectCode,
} from "@/lib/project-management";

describe("Project Management Business Logic", () => {
  describe("formatProjectCode", () => {
    it("converts code to uppercase and trims whitespace", () => {
      expect(formatProjectCode("wms")).toBe("WMS");
      expect(formatProjectCode("  ticketing  ")).toBe("TICKETING");
    });
  });

  describe("canUpdateProjectCode", () => {
    it("rejects modifying project code if project already has tickets", () => {
      const result = canUpdateProjectCode({
        currentCode: "WMS",
        newCode: "WMS2",
        ticketCount: 5,
      });

      expect(result.allowed).toBe(false);
      expect(result.error).toContain("tidak dapat diubah");
    });

    it("allows keeping the same code even if project has tickets", () => {
      const result = canUpdateProjectCode({
        currentCode: "WMS",
        newCode: "WMS",
        ticketCount: 10,
      });

      expect(result.allowed).toBe(true);
    });

    it("allows modifying project code if project has zero tickets", () => {
      const result = canUpdateProjectCode({
        currentCode: "WMS",
        newCode: "LOG",
        ticketCount: 0,
      });

      expect(result.allowed).toBe(true);
    });
  });

  describe("validateProjectInput", () => {
    it("accepts valid project creation payload", () => {
      const result = validateProjectInput({
        code: "WMS",
        name: "Warehouse Management",
        description: "Core warehouse system",
        discordChannelId: "123456789",
      });

      expect(result.valid).toBe(true);
      expect(result.data?.code).toBe("WMS");
    });

    it("rejects project with code that is too short or too long", () => {
      expect(validateProjectInput({ code: "W", name: "Short" }).valid).toBe(false);
      expect(
        validateProjectInput({ code: "VERYLONGPROJECTCODE", name: "Long" }).valid,
      ).toBe(false);
    });

    it("rejects empty name", () => {
      expect(validateProjectInput({ code: "WMS", name: "" }).valid).toBe(false);
    });

    it("allows optional description, ownerId, and discordChannelId", () => {
      const result = validateProjectInput({
        code: "ERP",
        name: "Enterprise Resource Planning",
      });
      expect(result.valid).toBe(true);
    });
  });

  describe("validateUpdateProjectInput", () => {
    it("allows partial updates", () => {
      const result = validateUpdateProjectInput({
        name: "New Name",
        isActive: false,
      });

      expect(result.valid).toBe(true);
      expect(result.data?.name).toBe("New Name");
      expect(result.data?.isActive).toBe(false);
    });

    it("formats code to uppercase when code is provided", () => {
      const result = validateUpdateProjectInput({
        code: "fin",
      });

      expect(result.valid).toBe(true);
      expect(result.data?.code).toBe("FIN");
    });
  });
});
