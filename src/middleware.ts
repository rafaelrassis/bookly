import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { isSocialCrawler } from "@/lib/bot";

const { auth } = NextAuth(authConfig);

const PROTECTED_PREFIXES = [
  "/home",
  "/search",
  "/book",
  "/shelf",
  "/lists",
  "/clubs",
  "/profile",
  "/settings",
  "/notifications",
  "/review",
  "/u",
];

/** Metadata files (OG image) são sempre públicos — WhatsApp/Telegram buscam
 * essa imagem sem cookie de sessão, e ela não expõe nada sensível. Em dev o
 * Next sufixa o nome do arquivo com um hash (ex.: "opengraph-image-15j707"),
 * daí o startsWith no último segmento em vez de um match exato. */
const PUBLIC_METADATA_FILES = ["opengraph-image", "twitter-image"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const lastSegment = pathname.slice(pathname.lastIndexOf("/") + 1);
  if (PUBLIC_METADATA_FILES.some((name) => lastSegment.startsWith(name))) return;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isCrawler = isSocialCrawler(req.headers.get("user-agent"));
  if (isProtected && !req.auth && !isCrawler) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|login|signup|forgot-password|onboarding|$).*)",
  ],
};
