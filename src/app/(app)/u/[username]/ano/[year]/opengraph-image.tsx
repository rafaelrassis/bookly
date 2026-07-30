import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { getYearStats } from "@/lib/stats";
import { OG_INK, OG_INK_DIM, OG_RIBBON, OG_SIZE, OgFrame, OgGeneric, ogFonts } from "@/lib/og";

export const alt = "Bookly";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: { username: string; year: string };
}) {
  const fonts = await ogFonts();
  const username = decodeURIComponent(params.username).replace(/^@/, "");
  const user = await db.user.findUnique({ where: { username } });

  if (!user) {
    return new ImageResponse(<OgGeneric />, { ...OG_SIZE, fonts });
  }

  const year = Number(params.year);
  const stats = await getYearStats(user.id, year);

  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
          <span style={{ display: "flex", fontSize: 28, color: OG_INK_DIM }}>
            {user.name} · {year}
          </span>

          {stats.booksRead === 0 ? (
            <span
              style={{
                display: "flex",
                marginTop: 16,
                fontFamily: "Fraunces",
                fontWeight: 900,
                fontSize: 64,
                color: OG_INK,
              }}
            >
              Ainda sem livros em {year}
            </span>
          ) : (
            <>
              <span
                style={{
                  display: "flex",
                  marginTop: 8,
                  fontFamily: "Fraunces",
                  fontWeight: 900,
                  fontSize: 96,
                  color: OG_INK,
                }}
              >
                {stats.booksRead} {stats.booksRead === 1 ? "livro" : "livros"}
              </span>
              <span style={{ display: "flex", marginTop: 12, fontSize: 32, color: OG_INK_DIM }}>
                {stats.pagesRead.toLocaleString("pt-BR")} páginas
                {stats.topGenres[0] ? ` · ${stats.topGenres[0].genre}` : ""}
                {stats.avgRating !== null ? ` · nota ${String(stats.avgRating).replace(".", ",")}` : ""}
              </span>
            </>
          )}

          {stats.covers.length > 0 && (
            <div style={{ display: "flex", gap: 20, marginTop: "auto" }}>
              {stats.covers.map((cover) => (
                <div
                  key={cover}
                  style={{
                    display: "flex",
                    width: 120,
                    height: 180,
                    borderRadius: 8,
                    overflow: "hidden",
                    background: OG_RIBBON,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cover} width={120} height={180} style={{ objectFit: "cover" }} alt="" />
                </div>
              ))}
            </div>
          )}
        </div>
      </OgFrame>
    ),
    { ...OG_SIZE, fonts }
  );
}
