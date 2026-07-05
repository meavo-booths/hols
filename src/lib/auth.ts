import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { SystemRole } from "@prisma/client";
import { authConfig } from "@/lib/auth.config";
import { authorizeInvitedGoogleUser, isGoogleAuthEnabled } from "@/lib/google-auth";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { VACATION_TRACKER_CARD_ID } from "@/lib/vacation-tracker";

const googleProvider =
  isGoogleAuthEnabled()
    ? Google({
        clientId: process.env.AUTH_GOOGLE_ID!,
        clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      })
    : null;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    ...(googleProvider ? [googleProvider] : []),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string)?.trim().toLowerCase();
        const password = credentials?.password as string;

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        const hasAccess = await prisma.toolCardAccess.findUnique({
          where: {
            userId_cardId: { userId: user.id, cardId: VACATION_TRACKER_CARD_ID },
          },
        });
        if (!hasAccess) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;

      const ok = await authorizeInvitedGoogleUser({
        user,
        account,
        name: user.name ?? (profile?.name as string | undefined),
        image: user.image ?? (profile?.picture as string | undefined),
        validate: async (existing) => {
          const hasAccess = await prisma.toolCardAccess.findUnique({
            where: {
              userId_cardId: { userId: existing.id, cardId: VACATION_TRACKER_CARD_ID },
            },
          });
          return Boolean(hasAccess);
        },
      });

      if (!ok) {
        const email = user.email?.trim().toLowerCase();
        if (email) {
          const existing = await prisma.user.findUnique({ where: { email } });
          if (existing) return "/login?error=NoAccess";
        }
        return "/login?error=NotInvited";
      }

      // Admin role is managed exclusively via the gateway admin UI.
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { systemRole: true },
        });
        token.systemRole = dbUser?.systemRole ?? SystemRole.USER;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { name: true, email: true, image: true, systemRole: true },
        });
        session.user.name = dbUser?.name ?? null;
        session.user.email = dbUser?.email ?? session.user.email;
        session.user.image = dbUser?.image ?? null;
        session.user.systemRole = dbUser?.systemRole ?? SystemRole.USER;
      }
      return session;
    },
  },
});
