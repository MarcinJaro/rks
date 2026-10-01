import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import { requireAdmin } from "./adminAuth";
import {
  articleImageIds,
  legacyImageUrls,
  legacyImageIndexes,
  parseArticleDocument,
} from "../src/lib/articleDocument";
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

// Artykuły przypisane w panelu do drużyny (np. relacje meczowe seniorów).
// Strony drużyn są statyczne i znają tylko slug, stąd rozwiązanie po slugu.
export const listPublishedByTeamSlug = query({
  args: { slug: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { slug, limit }) => {
    const team = await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!team) return [];

    const articles = await ctx.db
      .query("articles")
      .withIndex("by_team", (q) => q.eq("teamId", team._id))
      .order("desc")
      .filter((q) => q.eq(q.field("status"), "published"))
      .take(limit ?? 4);

    return await Promise.all(
      articles.map(async (article) => ({
        _id: article._id,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        category: article.category,
        publishedAt: article.publishedAt ?? article._creationTime,
        imageUrl: article.imageStorageId
          ? await ctx.storage.getUrl(article.imageStorageId)
          : null,
      })),
    );
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const article = await ctx.db
      .query("articles")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (article?.status !== "published") return null;
    return article;
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

export const adminMedia = query({
  args: { id: v.id("articles") },
  returns: v.record(v.string(), v.union(v.string(), v.null())),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const article = await ctx.db.get(id);
    if (!article) return {};
    const ids = [
      ...new Set([
        ...(article.inlineImageIds ?? []),
        ...(article.galleryIds ?? []),
        ...(article.imageStorageId ? [article.imageStorageId] : []),
      ]),
    ];
    return {
      ...Object.fromEntries(
        legacyImageUrls(article.contentHtml).map((url, index) => [
          `legacy:${index}`,
          url,
        ]),
      ),
      ...Object.fromEntries(
        await Promise.all(
          ids.map(async (storageId) => [
            storageId,
            await ctx.storage.getUrl(storageId),
          ]),
        ),
      ),
    };
  },
});

export const removeArticle = mutation({
  args: { id: v.id("articles") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const article = await ctx.db.get(id);
    if (!article) return;
    for (const imageId of new Set([
      ...(article.galleryIds ?? []),
      ...(article.inlineImageIds ?? []),
      ...(article.imageStorageId ? [article.imageStorageId] : []),
      ...(article.ogImageStorageId ? [article.ogImageStorageId] : []),
    ])) {
      await ctx.storage.delete(imageId);
    }
    await ctx.db.delete(id);
  },
});

export const saveDraft = mutation({
  args: {
    id: v.optional(v.id("articles")),
    contentJson: v.optional(v.string()),
    inlineImageIds: v.optional(v.array(v.id("_storage"))),
    galleryIds: v.optional(v.array(v.id("_storage"))),
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
  returns: v.id("articles"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = args.id ? await ctx.db.get(args.id) : null;
    if (args.id && !existing) throw new Error("Artykuł już nie istnieje");
    if (
      (args.galleryIds?.length ?? 0) > 60 ||
      (args.inlineImageIds?.length ?? 0) > 60
    )
      throw new Error("Maksymalnie 60 zdjęć w galerii i 60 w treści");
    if (args.contentJson) {
      const document = parseArticleDocument(args.contentJson);
      const ids = articleImageIds(document);
      const legacyIndexes = legacyImageIndexes(document);
      const oldUrls = legacyImageUrls(existing?.contentHtml ?? "");
      if (legacyIndexes.some((index) => !oldUrls[index]))
        throw new Error("Nieprawidłowe odwołanie do starszego zdjęcia");
      if (
        ids.some(
          (id) => !(args.inlineImageIds as string[] | undefined)?.includes(id),
        ) ||
        args.inlineImageIds?.some((id) => !ids.includes(id))
      )
        throw new Error("Niezgodna lista zdjęć w treści");
      args = {
        ...args,
        contentJson: JSON.stringify(document),
        contentHtml: legacyIndexes.length
          ? existing!.contentHtml
          : args.content
              .split(/\n{2,}/)
              .map(
                (text) =>
                  `<p>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br />")}</p>`,
              )
              .join("\n"),
      };
    }
    const existingMedia = new Set([
      ...(existing?.galleryIds ?? []),
      ...(existing?.inlineImageIds ?? []),
      ...(existing?.imageStorageId ? [existing.imageStorageId] : []),
    ]);
    for (const id of new Set([
      ...(args.galleryIds ?? []),
      ...(args.inlineImageIds ?? []),
      ...(args.imageStorageId ? [args.imageStorageId] : []),
    ])) {
      if (existingMedia.has(id)) continue;
      const file = await ctx.db.system.get(id);
      if (
        !file ||
        !["image/jpeg", "image/png", "image/webp"].includes(
          file.contentType ?? "",
        ) ||
        file.size > 10 * 1024 * 1024
      )
        throw new Error("Nieprawidłowy plik zdjęcia");
    }
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
    const bySlug = await ctx.db
      .query("articles")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (bySlug && bySlug._id !== args.id)
      throw new Error("Ten adres jest już zajęty przez inny artykuł");

    // Published articles need a publish date: the news feed orders and
    // paginates by publishedAt.
    const { id: _id, ...doc } = args;
    void _id;
    if (
      doc.status === "published" &&
      doc.publishedAt === undefined &&
      existing?.publishedAt === undefined
    ) {
      doc.publishedAt = Date.now();
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...doc,
        excerpt: args.excerpt,
        category: args.category,
        teamId: args.teamId,
        youtubeUrl: args.youtubeUrl,
      });
      return existing._id;
    }

    return await ctx.db.insert("articles", doc);
  },
});
