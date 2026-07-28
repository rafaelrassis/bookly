import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { OAuthConfig } from "next-auth/providers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "@/lib/auth.config";
import { emailLoginEnabled } from "@/lib/featureFlags";
import { db } from "@/lib/db";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

interface AmazonProfile {
  user_id: string;
  name?: string;
  email?: string;
}

/** Login with Amazon não tem provider nativo no Auth.js — é OAuth2 "genérico"
 * apontado direto pros endpoints da Amazon (https://developer.amazon.com/apps-and-games/login-with-amazon). */
function Amazon(): OAuthConfig<AmazonProfile> {
  return {
    id: "amazon",
    name: "Amazon",
    type: "oauth",
    authorization: {
      url: "https://www.amazon.com/ap/oa",
      params: { scope: "profile" },
    },
    token: "https://api.amazon.com/auth/o2/token",
    userinfo: "https://api.amazon.com/user/profile",
    clientId: process.env.AMAZON_CLIENT_ID,
    clientSecret: process.env.AMAZON_CLIENT_SECRET,
    profile(profile) {
      return {
        id: profile.user_id,
        name: profile.name ?? null,
        email: profile.email ?? null,
        image: null,
      };
    },
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Amazon(),
    // Login por e-mail/senha — desligado por padrão (ver src/lib/featureFlags.ts).
    ...(emailLoginEnabled
      ? [
          Credentials({
            credentials: {
              email: {},
              password: {},
            },
            authorize: async (raw) => {
              const parsed = loginSchema.safeParse(raw);
              if (!parsed.success) return null;
              const { email, password } = parsed.data;

              const user = await db.user.findUnique({ where: { email } });
              if (!user?.passwordHash) return null;

              const ok = await bcrypt.compare(password, user.passwordHash);
              if (!ok) return null;

              return { id: user.id, name: user.name, email: user.email, username: user.username };
            },
          }),
        ]
      : []),
  ],
});
