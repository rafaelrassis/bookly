import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "books.google.com" },
      { protocol: "https", hostname: "books.googleusercontent.com" },
    ],
  },
  // instrumentation.ts (init do Sentry no server/edge) é experimental até o
  // Next 15 — nesse projeto (Next 14.2) precisa do opt-in explícito.
  experimental: {
    instrumentationHook: true,
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // sem SENTRY_AUTH_TOKEN o plugin pula o upload de source maps (não falha o build).
  silent: !process.env.CI,
  widenClientFileUpload: true,
  webpack: {
    treeshake: { removeDebugLogging: true },
    // o auto-wrap de route handlers do Sentry mexe na Response do NextAuth e
    // derruba os Set-Cookie de state/pkceCodeVerifier no fluxo OAuth — o
    // callback então falha com InvalidCheck (cookie ausente). Login
    // Google/Amazon quebrou no dia em que o Sentry entrou; excluir a rota
    // do auto-instrument resolve.
    excludeServerRoutes: ["/api/auth/[...nextauth]"],
  },
});
