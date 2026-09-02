import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "../schema";
import { api, internal } from "../_generated/api";
import { modules } from "../test.setup";
import { isVideoEmbedBlocked } from "./sync";

test("isVideoEmbedBlocked detects the FB 'cannot embed' page by its help link", () => {
  // Zablokowany embed (np. muzyka objęta prawami) — plugin zwraca 200
  // ze statyczną stroną błędu linkującą do artykułu pomocy.
  const blocked =
    '<div class="_3i0o">Niedostępna</div>' +
    '<a href="/reel/1054997917248327/?ref=embed_video">Filmy na Facebooku</a>' +
    '<a href="https://www.facebook.com/help/396404120401278">Dowiedz się więcej</a>';
  expect(isVideoEmbedBlocked(blocked)).toBe(true);
  expect(isVideoEmbedBlocked('<a href="/help/396404120401278">x</a>')).toBe(true);

  const playable = "<html>VideoPlayerHTML playable content</html>";
  expect(isVideoEmbedBlocked(playable)).toBe(false);
});

test("insertPost and updatePost persist videoEmbeddable", async () => {
  const t = convexTest(schema, modules);
  const id = await t.mutation(internal.facebook.sync.insertPost, {
    fbPostId: "1_2",
    postType: "video",
    videoUrl: "https://www.facebook.com/reel/123/",
    videoEmbeddable: false,
    reactionsCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    fbUrl: "https://www.facebook.com/reel/123/",
    publishedAt: 1,
    syncedAt: 1,
  });

  let post = await t.run(async (ctx) => await ctx.db.get(id));
  expect(post?.videoEmbeddable).toBe(false);

  await t.mutation(internal.facebook.sync.updatePost, {
    id,
    videoEmbeddable: true,
    reactionsCount: 1,
    commentsCount: 0,
    sharesCount: 0,
    syncedAt: 2,
  });
  post = await t.run(async (ctx) => await ctx.db.get(id));
  expect(post?.videoEmbeddable).toBe(true);

  // Brak wartości (np. sonda nie powiodła się) nie nadpisuje zapisanej flagi.
  await t.mutation(internal.facebook.sync.updatePost, {
    id,
    reactionsCount: 2,
    commentsCount: 0,
    sharesCount: 0,
    syncedAt: 3,
  });
  post = await t.run(async (ctx) => await ctx.db.get(id));
  expect(post?.videoEmbeddable).toBe(true);
});

test("getSyncStatus returns null before any sync", async () => {
  const t = convexTest(schema, modules);
  const status = await t.query(api.facebook.sync.getSyncStatus, {});
  expect(status).toBeNull();
});

test("setSyncStatus upserts a single settings row and getSyncStatus parses it", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(internal.facebook.sync.setSyncStatus, {
    value: JSON.stringify({ ok: true, created: 2, updated: 1, errors: 0, at: 111 }),
  });
  await t.mutation(internal.facebook.sync.setSyncStatus, {
    value: JSON.stringify({
      ok: false,
      error: "token expired",
      created: 0,
      updated: 0,
      errors: 0,
      at: 222,
    }),
  });

  const status = await t.query(api.facebook.sync.getSyncStatus, {});
  expect(status).toMatchObject({ ok: false, error: "token expired", at: 222 });

  const rows = await t.run(async (ctx) => {
    return await ctx.db.query("settings").collect();
  });
  expect(rows).toHaveLength(1);
});

test("getSyncStatus returns null for malformed JSON", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(internal.facebook.sync.setSyncStatus, { value: "not-json" });
  const status = await t.query(api.facebook.sync.getSyncStatus, {});
  expect(status).toBeNull();
});
