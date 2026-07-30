import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { processReserveExpiry } from "@/lib/donation-expiry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Cron diário (ver vercel.json) — expira reservas paradas e avisa quem
 * está perto do prazo. Vercel Cron injeta Authorization: Bearer $CRON_SECRET. */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const result = await processReserveExpiry();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: "Falha no processamento" }, { status: 500 });
  }
}
