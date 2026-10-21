import { describe, it, expect } from "vitest";
import { checkIsInitialAdmin, resolveUserOnLogin } from "@/lib/auth-helpers";

describe("Auth Helpers", () => {
  describe("checkIsInitialAdmin", () => {
    it("returns true if discordId is in ADMIN_DISCORD_IDS", () => {
      expect(checkIsInitialAdmin("123456", "123456,789012")).toBe(true);
      expect(checkIsInitialAdmin("789012", "123456, 789012 ")).toBe(true);
    });

    it("returns false if discordId is not in ADMIN_DISCORD_IDS", () => {
      expect(checkIsInitialAdmin("999999", "123456,789012")).toBe(false);
      expect(checkIsInitialAdmin("999999", "")).toBe(false);
      expect(checkIsInitialAdmin("999999", undefined)).toBe(false);
    });
  });

  describe("resolveUserOnLogin", () => {
    it("assigns admin role to new user if in initial admin list", () => {
      const result = resolveUserOnLogin({
        existingUser: null,
        discordId: "admin-1",
        adminDiscordIds: "admin-1,admin-2",
      });

      expect(result.role).toBe("admin");
      expect(result.isNew).toBe(true);
    });

    it("assigns inactive role to new user if not in initial admin list", () => {
      const result = resolveUserOnLogin({
        existingUser: null,
        discordId: "user-regular",
        adminDiscordIds: "admin-1,admin-2",
      });

      expect(result.role).toBe("inactive");
      expect(result.isNew).toBe(true);
    });

    it("preserves existing role for returning user even if not in admin list", () => {
      const result = resolveUserOnLogin({
        existingUser: {
          id: "uuid-1",
          discordId: "user-be",
          role: "be",
        },
        discordId: "user-be",
        adminDiscordIds: "admin-1",
      });

      expect(result.role).toBe("be");
      expect(result.isNew).toBe(false);
    });

    it("preserves pre-registered role for newly logging in user", () => {
      const result = resolveUserOnLogin({
        existingUser: {
          id: "uuid-2",
          discordId: "preregistered-qa",
          role: "qa",
        },
        discordId: "preregistered-qa",
        adminDiscordIds: "admin-1",
      });

      expect(result.role).toBe("qa");
      expect(result.isNew).toBe(false);
    });
  });
});
