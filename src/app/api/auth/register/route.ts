import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { emailLoginEnabled } from "@/lib/featureFlags";
import { sendEmailCode } from "@/lib/verification";
import { usernameSchema } from "@/lib/validators/username";

const schema = z.object({
  email: z.string().email(),
  username: usernameSchema,
  password: z.string().min(8),
  name: z.string().min(1).max(60),
});

export async function POST(req: Request) {
  if (!emailLoginEnabled) return NextResponse.json({ error: "not found" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { email, username, password, name } = parsed.data;

  const clash = await db.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { email: true },
  });
  if (clash) {
    return NextResponse.json(
      { error: clash.email === email ? "e-mail em uso" : "username em uso" },
      { status: 409 }
    );
  }

  const user = await db.user.create({
    data: { email, username, name, passwordHash: await bcrypt.hash(password, 10) },
    select: { id: true, username: true },
  });

  await sendEmailCode(email);
  return NextResponse.json(user, { status: 201 });
}
