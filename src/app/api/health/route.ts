import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic"; // nunca cachear
export const runtime = "nodejs";

const TIMEOUT_MS = 2000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

async function checkDb(): Promise<{ status: "up" | "down"; latencyMs: number }> {
  const start = Date.now();
  try {
    await withTimeout(db.$queryRaw`SELECT 1`, TIMEOUT_MS);
    return { status: "up", latencyMs: Date.now() - start };
  } catch {
    return { status: "down", latencyMs: Date.now() - start };
  }
}

async function checkRedis(): Promise<{ status: "up" | "down"; latencyMs: number }> {
  const start = Date.now();
  try {
    const redis = Redis.fromEnv();
    await withTimeout(redis.ping(), TIMEOUT_MS);
    return { status: "up", latencyMs: Date.now() - start };
  } catch {
    return { status: "down", latencyMs: Date.now() - start };
  }
}

export async function GET() {
  const [dbCheck, redisCheck] = await Promise.all([checkDb(), checkRedis()]);
  const healthy = dbCheck.status === "up" && redisCheck.status === "up";

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      checks: { db: dbCheck, redis: redisCheck },
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
