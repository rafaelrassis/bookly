import { describe, it, expect } from "vitest";
import { buildProfilePatch } from "./index";

/** Campos que GET /api/users/me devolve (serializeProfile, src/lib/users.ts)
 * e que o AuthSync deve repassar ao store via applyProfile. Se um campo novo
 * for adicionado em serializeProfile e esquecido em buildProfilePatch, este
 * teste falha — é o guard-rail contra o bug de `following` ficar preso em 0. */
const CAMPOS_ESPERADOS = [
  "name",
  "username",
  "bio",
  "genres",
  "avatar",
  "avatarUrl",
  "top4",
  "top4Books",
  "followers",
  "following",
  "progressUnit",
  "city",
  "state",
] as const;

describe("buildProfilePatch", () => {
  it("repassa todos os campos esperados vindos do perfil da API", () => {
    const profile = {
      id: "user-1",
      name: "Fulana",
      username: "fulana",
      bio: "bio de teste",
      genres: ["ficção"],
      avatar: 2,
      avatarUrl: null,
      city: "São Paulo",
      state: "SP",
      top4: ["book-1"],
      top4Books: [],
      progressUnit: "pages" as const,
      followers: 4,
      following: 7,
      isMe: true,
      isFollowing: false,
      stats: {},
    };

    const patch = buildProfilePatch(profile);

    expect(Object.keys(patch).sort()).toEqual([...CAMPOS_ESPERADOS].sort());
    expect(patch.followers).toBe(4);
    expect(patch.following).toBe(7);
  });
});
