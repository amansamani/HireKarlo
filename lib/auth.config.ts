import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        // Replaced "as any" with a structural interface cast to appease the linter
        (session.user as { id: string }).id = token.id as string;
      }
      return session;
    },
  },
  providers: [], // filled in by lib/auth.ts
} satisfies NextAuthConfig;