export interface CheckGuildMembershipParams {
  discordUserId: string;
  accessToken?: string;
  guildId?: string;
  botToken?: string;
}

export async function checkDiscordGuildMembership({
  discordUserId,
  accessToken,
  guildId = process.env.DISCORD_GUILD_ID,
  botToken = process.env.DISCORD_BOT_TOKEN,
}: CheckGuildMembershipParams): Promise<boolean> {
  if (!guildId || !discordUserId) {
    return false;
  }

  try {
    // Attempt 1: If bot token is available, check guild member directly via bot API
    if (botToken) {
      const res = await fetch(
        `https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}`,
        {
          headers: {
            Authorization: `Bot ${botToken}`,
          },
        },
      );
      if (res.ok) {
        return true;
      }
      if (res.status === 404) {
        return false;
      }
    }

    // Attempt 2: If user access token is provided, check via user guilds member endpoint
    if (accessToken) {
      const res = await fetch(
        `https://discord.com/api/v10/users/@me/guilds/${guildId}/member`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      return res.ok;
    }

    return false;
  } catch (err) {
    console.error("Error checking Discord guild membership:", err);
    return false;
  }
}
