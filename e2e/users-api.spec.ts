import "dotenv/config";
import { test, expect, type Page } from "@playwright/test";
import { createAccount, seedAccount, signInAs } from "./helpers/auth";

async function register(_page: Page, account: ReturnType<typeof seedAccount>) {
  await createAccount(account);
}

async function login(page: Page, account: ReturnType<typeof seedAccount>) {
  await signInAs(page, account);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
});

test("PATCH /api/users/me rejeita username em uso e top4 inexistente", async ({ page }) => {
  const a = seedAccount("patch_a");
  const b = seedAccount("patch_b");
  await register(page, a);
  await register(page, b);
  await login(page, a);

  const taken = await page.request.patch("/api/users/me", { data: { username: b.username } });
  expect(taken.status()).toBe(409);

  const badTop4 = await page.request.patch("/api/users/me", {
    data: { top4: ["livro-que-nao-existe"] },
  });
  expect(badTop4.status()).toBe(400);

  const ok = await page.request.patch("/api/users/me", {
    data: { bio: "Bio de teste", top4: ["duna", "1984"] },
  });
  expect(ok.ok()).toBeTruthy();
  const body = await ok.json();
  expect(body.bio).toBe("Bio de teste");
  expect(body.top4).toEqual(["duna", "1984"]);
});

test("follow/unfollow real refletem em followers/following e isFollowing", async ({ page }) => {
  const a = seedAccount("follow_a");
  const b = seedAccount("follow_b");
  await register(page, a);
  await register(page, b);
  await login(page, a);

  const follow = await page.request.post(`/api/users/${b.username}/follow`);
  expect(follow.ok()).toBeTruthy();

  const profile = await page.request.get(`/api/users/${b.username}`);
  const profileBody = await profile.json();
  expect(profileBody.followers).toBe(1);
  expect(profileBody.isFollowing).toBe(true);

  const followersList = await page.request.get(`/api/users/${b.username}/followers`);
  const followersBody = await followersList.json();
  expect(followersBody.items.map((u: { username: string }) => u.username)).toContain(a.username);

  const unfollow = await page.request.delete(`/api/users/${b.username}/follow`);
  expect(unfollow.ok()).toBeTruthy();

  const profileAfter = await page.request.get(`/api/users/${b.username}`);
  const profileAfterBody = await profileAfter.json();
  expect(profileAfterBody.followers).toBe(0);
  expect(profileAfterBody.isFollowing).toBe(false);
});

test("não é possível seguir a si mesmo", async ({ page }) => {
  const a = seedAccount("self");
  await register(page, a);
  await login(page, a);

  const res = await page.request.post(`/api/users/${a.username}/follow`);
  expect(res.status()).toBe(400);
});
