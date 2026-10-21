import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkDiscordGuildMembership } from "@/lib/discord";

describe("Discord Guild Membership Check", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true when discord API returns 200", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ user: { id: "12345" } }),
    });

    const isMember = await checkDiscordGuildMembership({
      discordUserId: "12345",
      accessToken: "token123",
      guildId: "guild-999",
      botToken: "bot-token",
    });

    expect(isMember).toBe(true);
  });

  it("returns false when discord API returns 404 (not in guild)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: "Unknown Member", code: 10007 }),
    });

    const isMember = await checkDiscordGuildMembership({
      discordUserId: "12345",
      guildId: "guild-999",
      botToken: "bot-token",
    });

    expect(isMember).toBe(false);
  });

  it("returns false if guildId is missing", async () => {
    const isMember = await checkDiscordGuildMembership({
      discordUserId: "12345",
    });

    expect(isMember).toBe(false);
  });
});
