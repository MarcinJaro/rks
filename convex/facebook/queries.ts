import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../adminAuth";

export const listForAdmin = query({
  args: {
    limit: v.optional(v.number()),
    includeHidden: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const posts = await ctx.db
      .query("fbPosts")
      .withIndex("by_publishedAt")
      .order("desc")
      .take(args.limit || 50);

    return posts.filter((post) => args.includeHidden || !post.isHidden);
  },
});

export const listByTeam = query({
  args: {
    teamId: v.id("teams"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { teamId, limit }) => {
    return await ctx.db
      .query("fbPosts")
      .withIndex("by_team", (q) => q.eq("teamId", teamId))
      .order("desc")
      .filter((q) => q.eq(q.field("isHidden"), false))
      .take(limit || 12);
  },
});
