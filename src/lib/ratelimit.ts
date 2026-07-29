import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

const hasRedis =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasRedis ? Redis.fromEnv() : null;

function make(tokens: number, window: `${number} m` | `${number} s`, prefix: string) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    prefix,
    analytics: true,
  });
}

// Tiers por tipo de rota
export const limiters = {
  write: make(30, "1 m", "rl:write"), // escrita geral (progresso, metas, reviews, tags, status)
  upload: make(5, "1 m", "rl:upload"), // upload de avatar — mais agressivo
  feedback: make(4, "1 m", "rl:feedback"), // feedback — alvo fácil de spam
  chat: make(20, "1 m", "rl:chat"), // mensagens de clube
  import: make(2, "60 m", "rl:import"), // import de CSV — pesado, gasta cota do Google Books
};

export type LimiterKey = keyof typeof limiters;

/** Identificador pra rotas sem sessão (cadastro, reset de senha): IP do
 * cliente via x-forwarded-for (Vercel injeta esse header). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || "anon";
}

/**
 * Retorna null se liberado; um NextResponse 429 se estourou o limite.
 * Fail-open: se Redis não está configurado (dev) ou cai (prod), não bloqueia
 * o usuário — apenas loga. Perder rate limit é melhor que derrubar o app.
 */
export async function checkRateLimit(key: LimiterKey, identifier: string) {
  const limiter = limiters[key];
  if (!limiter) {
    if (process.env.NODE_ENV === "production") {
      console.warn(`Rate limiter "${key}" sem Redis em produção`);
    }
    return null; // fail-open
  }
  try {
    const { success, limit, remaining, reset } = await limiter.limit(identifier);
    if (success) return null;
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: "Muitas requisições. Tente de novo em instantes." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": String(remaining),
        },
      },
    );
  } catch (e) {
    console.error("rate limit check falhou, liberando (fail-open)", e);
    return null; // fail-open
  }
}
