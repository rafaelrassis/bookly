import { ImageResponse } from "next/og";
import { AVATAR_CHOICES } from "@/lib/avatars";
import { db } from "@/lib/db";
import { userStats } from "@/lib/stats";
import { OG_INK, OG_INK_DIM, OG_RIBBON, OG_SIZE, OgFrame, OgGeneric, ogFonts } from "@/lib/og";

export const alt = "Bookly";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: { username: string } }) {
  const fonts = await ogFonts();
  const username = decodeURIComponent(params.username).replace(/^@/, "");
  const user = await db.user.findUnique({ where: { username } });

  if (!user) {
    return new ImageResponse(<OgGeneric />, { ...OG_SIZE, fonts });
  }

  const [followers, stats] = await Promise.all([
    db.follow.count({ where: { followingId: user.id } }),
    userStats(user.id),
  ]);
  const [avatarFrom, avatarTo] = AVATAR_CHOICES[user.avatar] ?? AVATAR_CHOICES[0];

  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ display: "flex", alignItems: "center", gap: 48, width: "100%" }}>
          {user.avatarUrl ? (
            <div
              style={{
                display: "flex",
                width: 220,
                height: 220,
                borderRadius: 999,
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user.avatarUrl}
                width={220}
                height={220}
                style={{ objectFit: "cover" }}
                alt=""
              />
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 220,
                height: 220,
                borderRadius: 999,
                flexShrink: 0,
                fontFamily: "Fraunces",
                fontWeight: 900,
                fontSize: 92,
                color: "rgba(255,255,255,0.92)",
                background: `linear-gradient(135deg, ${avatarFrom}, ${avatarTo})`,
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <span
              style={{
                display: "flex",
                fontFamily: "Fraunces",
                fontWeight: 900,
                fontSize: 56,
                lineHeight: 1.15,
                color: OG_INK,
              }}
            >
              {user.name}
            </span>
            <span style={{ display: "flex", marginTop: 8, fontSize: 28, color: OG_INK_DIM }}>
              @{user.username}
            </span>

            <div style={{ display: "flex", gap: 40, marginTop: 36 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    display: "flex",
                    fontFamily: "Fraunces",
                    fontWeight: 900,
                    fontSize: 40,
                    color: OG_RIBBON,
                  }}
                >
                  {stats.readCount}
                </span>
                <span style={{ display: "flex", fontSize: 20, color: OG_INK_DIM }}>lidos</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    display: "flex",
                    fontFamily: "Fraunces",
                    fontWeight: 900,
                    fontSize: 40,
                    color: OG_RIBBON,
                  }}
                >
                  {followers}
                </span>
                <span style={{ display: "flex", fontSize: 20, color: OG_INK_DIM }}>
                  seguidores
                </span>
              </div>
            </div>
          </div>
        </div>
      </OgFrame>
    ),
    { ...OG_SIZE, fonts }
  );
}
