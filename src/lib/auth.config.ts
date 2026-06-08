import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  trustHost: true,
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = request.nextUrl.pathname.startsWith("/login");
      if (isLoginPage) return true;
      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
