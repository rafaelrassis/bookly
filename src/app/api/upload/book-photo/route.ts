import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/ratelimit";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_SIDE = 1200;

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
      { error: "Arquivo muito grande. Máximo 8MB." },
      { status: 413 },
    );
  }

  try {
    const input = Buffer.from(await file.arrayBuffer());
    const webp = await sharp(input)
      .resize(MAX_SIDE, MAX_SIDE, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const { url } = await put(`book-photos/${session.user.id}.webp`, webp, {
      access: "public",
      contentType: "image/webp",
      addRandomSuffix: true,
    });

    return NextResponse.json({ url });
  } catch (err) {
    console.error("book photo upload failed", err);
    return NextResponse.json(
      { error: "Falha ao enviar imagem. Tente novamente." },
      { status: 502 },
    );
  }
}
