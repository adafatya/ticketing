import NextAuth, { type DefaultSession } from "next-auth";
import Discord from "next-auth/providers/discord";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { checkDiscordGuildMembership } from "@/lib/discord";
import { resolveUserOnLogin, type UserRole } from "@/lib/auth-helpers";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      discordId: string;
      role: UserRole;
    } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "identify email guilds.members.read",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/unauthorized",
  },
  callbacks: {
    async signIn({ account, profile, user }) {
      if (!profile?.id) {
        return false;
      }

      const discordId = profile.id as string;
      const isMember = await checkDiscordGuildMembership({
        discordUserId: discordId,
        accessToken: account?.access_token,
      });

      if (!isMember) {
        return "/unauthorized?reason=not_in_guild";
      }

      try {
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.discordId, discordId))
          .limit(1);

        const { role } = resolveUserOnLogin({
          existingUser: existingUser
            ? {
                id: existingUser.id,
                discordId: existingUser.discordId,
                role: existingUser.role,
              }
            : null,
          discordId,
          adminDiscordIds: process.env.ADMIN_DISCORD_IDS,
        });

        const avatarUrl = (profile as { avatar?: string }).avatar
          ? `https://cdn.discordapp.com/avatars/${discordId}/${(profile as { avatar?: string }).avatar}.png`
          : null;

        if (existingUser) {
          await db
            .update(users)
            .set({
              username: (profile as { username?: string }).username || existingUser.username,
              avatar: avatarUrl || existingUser.avatar,
              email: user?.email || existingUser.email,
              lastLoginAt: new Date(),
            })
            .where(eq(users.id, existingUser.id));
        } else {
          await db.insert(users).values({
            discordId,
            username: (profile as { username?: string }).username || "Discord User",
            avatar: avatarUrl,
            email: user?.email || null,
            role,
            lastLoginAt: new Date(),
          });
        }

        return true;
      } catch (err) {
        console.error("Database error during sign-in:", err);
        return false;
      }
    },

    async jwt({ token, profile }) {
      if (profile?.id) {
        token.discordId = profile.id as string;
      }

      if (token.discordId) {
        try {
          const [dbUser] = await db
            .select({ id: users.id, role: users.role })
            .from(users)
            .where(eq(users.discordId, token.discordId as string))
            .limit(1);

          if (dbUser) {
            token.userId = dbUser.id;
            token.role = dbUser.role;
          }
        } catch (err) {
          console.error("Error fetching user in jwt callback:", err);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string) || "";
        session.user.discordId = (token.discordId as string) || "";
        session.user.role = (token.role as UserRole) || "inactive";
      }
      return session;
    },
  },
});
