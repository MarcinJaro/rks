import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import { requireAdmin } from "./adminAuth";

export const listPublished = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    return await ctx.db
      .query("articles")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc")
      .take(limit || 20);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("articles")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
  },
});

export const saveDraft = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    content: v.string(),
    contentHtml: v.string(),
    excerpt: v.optional(v.string()),
    category: v.optional(v.string()),
    teamId: v.optional(v.id("teams")),
    publishedAt: v.optional(v.number()),
    status: v.union(v.literal("draft"), v.literal("published")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("articles")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }

    return await ctx.db.insert("articles", args);
  },
});
