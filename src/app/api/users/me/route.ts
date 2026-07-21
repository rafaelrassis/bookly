import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBook } from "@/data/books";
import { serializeProfile } from "@/lib/users";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const profile = await serializeProfile(session.user.id, session.user.id);
  return NextResponse.json(profile);
}

const schema = z.object({
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-z0-9._]+$/)
    .optional(),
  name: z.string().min(1).max(60).optional(),
  bio: z.string().max(500).optional(),
  avatar: z.number().int().min(0).optional(),
  top4: z.array(z.string()).max(4).optional(),
  genres: z.array(z.string()).optional(),
  progressUnit: z.enum(["pages", "percent"]).optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  if (data.username) {
    const taken = await db.user.findFirst({
      where: { username: data.username, NOT: { id: session.user.id } },
      select: { id: true },
    });
    if (taken) return NextResponse.json({ error: "username em uso" }, { status: 409 });
  }
  if (data.top4?.length) {
    const missing = data.top4.filter((id) => !getBook(id));
    if (missing.length > 0) {
      return NextResponse.json({ error: "top4 com livro inexistente" }, { status: 400 });
    }
  }

  await db.user.update({ where: { id: session.user.id }, data });
  const profile = await serializeProfile(session.user.id, session.user.id);
  return NextResponse.json(profile);
}
