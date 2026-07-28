import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { OAuthConfig } from "next-auth/providers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { authConfig } from "@/lib/auth.config";
import { db } from "@/lib/db";

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
  ],
});
