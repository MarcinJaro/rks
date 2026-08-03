import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { fbCategory } from "../schema";
import { requireAdmin } from "../adminAuth";

export const setHidden = mutation({
  args: {
    id: v.id("fbPosts"),
    isHidden: v.boolean(),
  },
  handler: async (ctx, { id, isHidden }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { isHidden });
  },
});

export const setPinned = mutation({
  args: {
    id: v.id("fbPosts"),
    isPinned: v.boolean(),
  },
  handler: async (ctx, { id, isPinned }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { isPinned });
  },
});

export const categorize = mutation({
  args: {
    id: v.id("fbPosts"),
    category: v.optional(fbCategory),
    teamId: v.optional(v.id("teams")),
  },
  handler: async (ctx, { id, category, teamId }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { category, teamId });
  },
});
