import type { NextAuthConfig } from "next-auth";

/**
 * Config "edge-safe": sem providers OAuth nem adapter (ambos dependem de
 * Node APIs — fetch a endpoints de token e Prisma). Usado pelo middleware,
 * que roda no Edge runtime e só precisa decodificar o JWT da sessão; os
 * providers Google/Amazon + PrismaAdapter só entram em src/lib/auth.ts,
 * usado pelas rotas.
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
