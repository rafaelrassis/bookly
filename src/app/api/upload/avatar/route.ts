import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/ratelimit";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const limited = await checkRateLimit("upload", session.user.id);
  if (limited) return limited;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo ausente." }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Tipo não suportado. Use JPG, PNG ou WebP." },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Arquivo muito grande. Máximo 5MB." },
      { status: 413 },
    );
  }

  try {
    const input = Buffer.from(await file.arrayBuffer());
    const webp = await sharp(input)
      .resize(400, 400, { fit: "cover", position: "center" })
      .webp({ quality: 80 })
      .toBuffer();

    const { url } = await put(`avatars/${session.user.id}.webp`, webp, {
      access: "public",
      contentType: "image/webp",
      allowOverwrite: true,
      addRandomSuffix: false,
    });

    // A chave do blob é fixa por usuário (overwrite), então a URL não muda
    // entre uploads — sem isso o browser e o otimizador de imagem do Next
    // continuam servindo a foto antiga em cache pra essa mesma URL.
    const cacheBustedUrl = `${url}?v=${Date.now()}`;

    await db.user.update({
      where: { id: session.user.id },
      data: { avatarUrl: cacheBustedUrl },
    });

    return NextResponse.json({ url: cacheBustedUrl });
  } catch (err) {
    console.error("avatar upload failed", err);
    return NextResponse.json(
      { error: "Falha ao enviar imagem. Tente novamente." },
      { status: 502 },
    );
  }
}
