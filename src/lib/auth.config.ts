import type { NextAuthConfig } from "next-auth";

/**
 * Config "edge-safe": sem providers que dependem de Node APIs (Prisma, bcrypt).
 * Usado pelo middleware, que roda no Edge runtime. O provider Credentials
 * (com acesso ao banco) só entra em src/lib/auth.ts, usado pelas rotas.
 */
export const authConfig = {
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.uid = user.id;
        token.username = (user as { username?: string }).username;
      }
      return token;
    },
    session: ({ session, token }) => {
      if (token.uid) session.user.id = token.uid as string;
      if (token.username) session.user.username = token.username as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
