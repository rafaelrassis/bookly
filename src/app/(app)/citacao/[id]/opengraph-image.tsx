import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { OG_INK, OG_INK_DIM, OG_SIZE, OgFrame, OgGeneric, ogFonts, ogTruncate } from "@/lib/og";

export const alt = "Bookly";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: { id: string } }) {
  const fonts = await ogFonts();
  const quote = await db.quote.findUnique({
    where: { id: params.id },
    include: { user: { select: { username: true } }, book: { select: { title: true } } },
  });

  if (!quote) {
    return new ImageResponse(<OgGeneric />, { ...OG_SIZE, fonts });
  }

  return new ImageResponse(
    (
      <OgFrame>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            width: "100%",
          }}
        >
          <span
            style={{
              display: "flex",
              fontFamily: "Fraunces",
              fontStyle: "italic",
              fontWeight: 700,
              fontSize: 42,
              lineHeight: 1.4,
              color: OG_INK,
            }}
          >
            “{ogTruncate(quote.text, 220)}”
          </span>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 32 }}>
            <span
              style={{
                display: "flex",
                fontFamily: "Fraunces",
                fontWeight: 900,
                fontSize: 26,
                color: OG_INK,
              }}
            >
              {quote.book.title}
            </span>
            <span style={{ display: "flex", marginTop: 8, fontSize: 20, color: OG_INK_DIM }}>
              {quote.page ? `pág. ${quote.page} · ` : ""}@{quote.user.username}
            </span>
          </div>
        </div>
      </OgFrame>
    ),
    { ...OG_SIZE, fonts }
  );
}
