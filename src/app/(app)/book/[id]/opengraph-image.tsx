import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { OG_INK, OG_INK_DIM, OG_RIBBON, OG_SIZE, OgFrame, OgGeneric, OgStars, ogFonts } from "@/lib/og";

export const alt = "Bookly";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: { id: string } }) {
  const fonts = await ogFonts();
  const book = await db.book.findUnique({ where: { id: params.id } });

  if (!book) {
    return new ImageResponse(<OgGeneric />, { ...OG_SIZE, fonts });
  }

  const [gradientFrom, gradientTo] = [book.gradientFrom, book.gradientTo];
  const meta = [book.authors, book.year > 0 ? String(book.year) : null].filter(Boolean).join(" · ");

  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ display: "flex", alignItems: "center", gap: 56, width: "100%" }}>
          <div
            style={{
              display: "flex",
              width: 260,
              height: 390,
              borderRadius: 14,
              overflow: "hidden",
              flexShrink: 0,
              background: `linear-gradient(155deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
            }}
          >
            {book.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={book.coverUrl}
                width={260}
                height={390}
                style={{ objectFit: "cover" }}
                alt=""
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  width: "100%",
                  height: "100%",
                  padding: 24,
                }}
              >
                <span
                  style={{
                    fontFamily: "Fraunces",
                    fontWeight: 900,
                    fontSize: 30,
                    lineHeight: 1.2,
                    color: "rgba(255,255,255,0.92)",
                  }}
                >
                  {book.title}
                </span>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <span
              style={{
                display: "flex",
                fontFamily: "Fraunces",
                fontWeight: 900,
                fontSize: 54,
                lineHeight: 1.15,
                color: OG_INK,
              }}
            >
              {book.title}
            </span>
            <span style={{ display: "flex", marginTop: 18, fontSize: 26, color: OG_INK_DIM }}>
              {meta}
            </span>
            {book.count > 0 && (
              <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 36 }}>
                <span
                  style={{
                    display: "flex",
                    fontFamily: "Fraunces",
                    fontWeight: 900,
                    fontSize: 44,
                    color: OG_RIBBON,
                  }}
                >
                  {book.avg.toFixed(1).replace(".", ",")}
                </span>
                <OgStars rating={book.avg} size={26} />
                <span style={{ display: "flex", fontSize: 24, color: OG_INK_DIM }}>
                  {book.count} {book.count === 1 ? "avaliação" : "avaliações"}
                </span>
              </div>
            )}
          </div>
        </div>
      </OgFrame>
    ),
    { ...OG_SIZE, fonts }
  );
}
