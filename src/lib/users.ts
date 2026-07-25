import { db } from "@/lib/db";
import { userStats } from "@/lib/stats";
import { serializeBook } from "@/lib/books";

export async function serializeProfile(targetId: string, viewerId?: string) {
  const [target, followers, following, followRow, stats] = await Promise.all([
    db.user.findUnique({ where: { id: targetId } }),
    db.follow.count({ where: { followingId: targetId } }),
    db.follow.count({ where: { followerId: targetId } }),
    viewerId && viewerId !== targetId
      ? db.follow.findUnique({
          where: { followerId_followingId: { followerId: viewerId, followingId: targetId } },
        })
      : null,
    userStats(targetId),
  ]);
  if (!target) return null;

  const top4Books = target.top4.length
    ? await db.book.findMany({ where: { id: { in: target.top4 } } })
    : [];
  const byId = new Map(top4Books.map((b) => [b.id, serializeBook(b)]));

  return {
    id: target.id,
    username: target.username,
    name: target.name,
    bio: target.bio ?? "",
    genres: target.genres,
    avatar: target.avatar,
    avatarUrl: target.avatarUrl,
    top4: target.top4,
    top4Books: target.top4.map((id) => byId.get(id)).filter((b): b is NonNullable<typeof b> => Boolean(b)),
    progressUnit: target.progressUnit,
    followers,
    following,
    isMe: viewerId === targetId,
    isFollowing: Boolean(followRow),
    stats,
  };
}
