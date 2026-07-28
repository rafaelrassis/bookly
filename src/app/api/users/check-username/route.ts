import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { usernameSchema } from "@/lib/validators/username";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const raw = new URL(req.url).searchParams.get("u") ?? "";
  const parsed = usernameSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { available: false, error: parsed.error.issues[0].message },
      { status: 200 }
    );
  }

  // citext -> comparação case-insensitive no banco
  const existing = await db.user.findUnique({
    where: { username: parsed.data },
    select: { id: true },
  });

  const available = !existing || existing.id === session.user.id;
  return NextResponse.json({ available });
}
