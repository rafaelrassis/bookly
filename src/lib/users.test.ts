import { describe, it, expect, afterAll } from "vitest";
import { db } from "@/lib/db";
import { serializeProfile } from "./users";

describe("serializeProfile", () => {
  it("reflete followers/following dos dois lados de uma relação de follow", async () => {
    const [userA, userB] = await Promise.all([
      db.user.create({
        data: { email: `a-${Date.now()}@teste.com`, name: "Usuária A" },
      }),
      db.user.create({
        data: { email: `b-${Date.now()}@teste.com`, name: "Usuário B" },
      }),
    ]);

    try {
      // A segue B
      await db.follow.create({
        data: { followerId: userA.id, followingId: userB.id },
      });

      const [profileA, profileB] = await Promise.all([
        serializeProfile(userA.id),
        serializeProfile(userB.id),
      ]);

      expect(profileA).not.toBeNull();
      expect(profileB).not.toBeNull();
      // A segue 1 pessoa e não tem seguidores.
      expect(profileA!.following).toBe(1);
      expect(profileA!.followers).toBe(0);
      // B tem 1 seguidor e não segue ninguém.
      expect(profileB!.followers).toBe(1);
      expect(profileB!.following).toBe(0);
    } finally {
      await db.follow.deleteMany({
        where: { OR: [{ followerId: userA.id }, { followingId: userA.id }, { followerId: userB.id }, { followingId: userB.id }] },
      });
      await db.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
    }
  });
});

afterAll(async () => {
  await db.$disconnect();
});
