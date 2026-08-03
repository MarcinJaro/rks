import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";

export const list = query({
  args: { activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, { activeOnly }) => {
    const teams = await ctx.db
      .query("teams")
      .withIndex("by_sortOrder")
      .order("asc")
      .collect();

    return activeOnly ? teams.filter((team) => team.isActive) : teams;
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
  },
});

export const upsert = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    yearGroup: v.optional(v.number()),
    league: v.optional(v.string()),
    schedule: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }

    return await ctx.db.insert("teams", args);
  },
});
