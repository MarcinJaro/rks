import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import { requireAdmin } from "./adminAuth";
import { slugify } from "./slugify";

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

export const adminList = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const articles = await ctx.db.query("articles").order("desc").take(200);
    return await Promise.all(
      articles.map(async (article) => ({
        ...article,
        imageUrl: article.imageStorageId
          ? await ctx.storage.getUrl(article.imageStorageId)
          : null,
      })),
    );
  },
});

export const removeArticle = mutation({
  args: { id: v.id("articles") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const article = await ctx.db.get(id);
    if (!article) return;
    if (article.imageStorageId) await ctx.storage.delete(article.imageStorageId);
    if (article.ogImageStorageId) await ctx.storage.delete(article.ogImageStorageId);
    for (const imageId of article.galleryIds ?? []) {
      await ctx.storage.delete(imageId);
    }
    await ctx.db.delete(id);
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
    imageStorageId: v.optional(v.id("_storage")),
    youtubeUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!args.title.trim()) throw new Error("Podaj tytuł artykułu");
    // Pusty slug = generujemy z tytułu, z sufiksem przy kolizji.
    if (!args.slug.trim()) {
      const base = slugify(args.title) || "artykul";
      let candidate = base;
      for (let i = 2; ; i += 1) {
        const taken = await ctx.db
          .query("articles")
          .withIndex("by_slug", (q) => q.eq("slug", candidate))
          .first();
        if (!taken) break;
        candidate = `${base}-${i}`;
      }
      args = { ...args, slug: candidate };
    }
    const existing = await ctx.db
      .query("articles")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    // Published articles need a publish date: the news feed orders and
    // paginates by publishedAt.
    const doc = { ...args };
    if (
      doc.status === "published" &&
      doc.publishedAt === undefined &&
      existing?.publishedAt === undefined
    ) {
      doc.publishedAt = Date.now();
    }

    if (existing) {
      // Podmiana zdjęcia głównego: stary plik znika ze storage.
      if (
        doc.imageStorageId &&
        existing.imageStorageId &&
        doc.imageStorageId !== existing.imageStorageId
      ) {
        await ctx.storage.delete(existing.imageStorageId);
      }
      await ctx.db.patch(existing._id, doc);
      return existing._id;
    }

    return await ctx.db.insert("articles", doc);
  },
});
