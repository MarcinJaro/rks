import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { requireAdmin } from "./adminAuth";

const AUTO_SYNC_KEY = "autoSyncEnabled";

async function readFlag(ctx: QueryCtx) {
  const setting = await ctx.db
    .query("appSettings")
    .withIndex("by_key", (q) => q.eq("key", AUTO_SYNC_KEY))
    .first();
  return setting?.boolValue ?? true;
}

export const getAutoSync = query({
  args: {},
  handler: async (ctx) => await readFlag(ctx),
});

export const readAutoSync = internalQuery({
  args: {},
  handler: async (ctx) => await readFlag(ctx),
});

export const setAutoSync = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, { enabled }) => {
    await requireAdmin(ctx);

    const existing = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", AUTO_SYNC_KEY))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { boolValue: enabled });
      return;
    }

    await ctx.db.insert("appSettings", {
      key: AUTO_SYNC_KEY,
      boolValue: enabled,
    });
  },
});
