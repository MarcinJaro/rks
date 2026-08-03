import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "../schema";
import { api, internal } from "../_generated/api";
import { modules } from "../test.setup";

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
