import { db } from "@/lib/db";
import { userStats } from "@/lib/stats";

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

  return {
    id: target.id,
    username: target.username,
    name: target.name,
    bio: target.bio ?? "",
    genres: target.genres,
    avatar: target.avatar,
    top4: target.top4,
    progressUnit: target.progressUnit,
    followers,
    following,
    isMe: viewerId === targetId,
    isFollowing: Boolean(followRow),
    stats,
  };
}
