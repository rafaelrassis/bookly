import { ImageResponse } from "next/og";
import { AVATAR_CHOICES, hashAvatarIndex } from "@/lib/avatars";
import { db } from "@/lib/db";
import {
  OG_INK,
  OG_INK_DIM,
  OG_SIZE,
  OgFrame,
  OgGeneric,
  OgStars,
  ogFonts,
  ogTruncate,
} from "@/lib/og";

export const alt = "Bookly";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: { id: string } }) {
  const fonts = await ogFonts();
  const review = await db.review.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { username: true, name: true, avatar: true, avatarUrl: true } },
      book: true,
    },
  });

  if (!review) {
    return new ImageResponse(<OgGeneric />, { ...OG_SIZE, fonts });
  }

  const { book, user } = review;
  const [avatarFrom, avatarTo] =
    AVATAR_CHOICES[user.avatar] ?? AVATAR_CHOICES[hashAvatarIndex(`@${user.username}`)];

  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <div
              style={{
                display: "flex",
                width: 180,
                height: 270,
                borderRadius: 12,
                overflow: "hidden",
                flexShrink: 0,
                background: `linear-gradient(155deg, ${book.gradientFrom} 0%, ${book.gradientTo} 100%)`,
              }}
            >
              {book.coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={book.coverUrl}
                  width={180}
                  height={270}
                  style={{ objectFit: "cover" }}
                  alt=""
                />
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
              <span style={{ display: "flex", fontSize: 26, color: OG_INK_DIM }}>
                avaliou {book.title}
              </span>
              <span
                style={{
                  display: "flex",
                  marginTop: 10,
                  fontFamily: "Fraunces",
                  fontWeight: 900,
                  fontSize: 44,
                  lineHeight: 1.2,
                  color: OG_INK,
                }}
              >
                {review.title || book.title}
              </span>
              <div style={{ display: "flex", marginTop: 14 }}>
                <OgStars rating={review.rating} size={32} />
              </div>
            </div>
          </div>

          {review.text && (
            <span
              style={{
                display: "flex",
                marginTop: 32,
                fontFamily: "Fraunces",
                fontStyle: "italic",
                fontSize: 28,
                lineHeight: 1.5,
                color: OG_INK,
              }}
            >
              “{ogTruncate(review.text, 140)}”
            </span>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: "auto" }}>
            {user.avatarUrl ? (
              <div
                style={{
                  display: "flex",
                  width: 56,
                  height: 56,
                  borderRadius: 999,
                  overflow: "hidden",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={user.avatarUrl} width={56} height={56} style={{ objectFit: "cover" }} alt="" />
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 56,
                  height: 56,
                  borderRadius: 999,
                  fontFamily: "Fraunces",
                  fontWeight: 900,
                  fontSize: 24,
                  color: "rgba(255,255,255,0.92)",
                  background: `linear-gradient(135deg, ${avatarFrom}, ${avatarTo})`,
                }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ display: "flex", fontSize: 24, fontWeight: 700, color: OG_INK }}>
                {user.name}
              </span>
              <span style={{ display: "flex", fontSize: 20, color: OG_INK_DIM }}>
                @{user.username}
              </span>
            </div>
          </div>
        </div>
      </OgFrame>
    ),
    { ...OG_SIZE, fonts }
  );
}
