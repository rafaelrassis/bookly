import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { OG_INK, OG_INK_DIM, OgFrame, ogFonts, ogTruncate } from "@/lib/og";

/** Formato Stories (vertical) — pensado pra "Adicionar ao story" do
 * Instagram, não pra link-preview (isso é o opengraph-image da página, que
 * segue o padrão landscape 1200x630 do resto do app). Rota pública (sem
 * auth) por natureza: existe pra ser baixada/compartilhada por quem tem o
 * link, igual às imagens de OG do app. */
const CARD_SIZE = { width: 1080, height: 1920 };

export async function GET(_req: Request, { params }: { params: { quoteId: string } }) {
  const fonts = await ogFonts();
  const quote = await db.quote.findUnique({
    where: { id: params.quoteId },
    include: { user: { select: { username: true } }, book: { select: { title: true } } },
  });

  if (!quote) return new Response("não encontrada", { status: 404 });

  return new ImageResponse(
    (
      <OgFrame>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            width: "100%",
            height: "100%",
          }}
        >
          <span
            style={{
              display: "flex",
              fontFamily: "Fraunces",
              fontStyle: "italic",
              fontWeight: 700,
              fontSize: 64,
              lineHeight: 1.4,
              color: OG_INK,
            }}
          >
            “{ogTruncate(quote.text, 500)}”
          </span>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 64 }}>
            <span
              style={{
                display: "flex",
                fontFamily: "Fraunces",
                fontWeight: 900,
                fontSize: 34,
                color: OG_INK,
              }}
            >
              {quote.book.title}
            </span>
            <span style={{ display: "flex", marginTop: 12, fontSize: 26, color: OG_INK_DIM }}>
              {quote.page ? `pág. ${quote.page} · ` : ""}@{quote.user.username}
            </span>
          </div>
        </div>
      </OgFrame>
    ),
    { ...CARD_SIZE, fonts }
  );
}
