import { query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { v, type Infer } from "convex/values";
import { fbCategory } from "./schema";

async function mapFbPost(ctx: QueryCtx, post: Doc<"fbPosts">) {
  return {
    _id: post._id,
    source: "facebook" as const,
    slug: post.slug,
    content: post.content,
    contentHtml: post.contentHtml,
    imageUrl: post.imageStorageId
      ? await ctx.storage.getUrl(post.imageStorageId)
      : null,
    imageUrls: post.imageIds
      ? await Promise.all(post.imageIds.map((id) => ctx.storage.getUrl(id)))
      : [],
    postType: post.postType,
    publishedAt: post.publishedAt,
    category: post.category,
    teamId: post.teamId,
    engagement: {
      reactions: post.reactionsCount,
      comments: post.commentsCount,
      shares: post.sharesCount,
    },
    url: post.fbUrl,
    isPinned: post.isPinned,
  };
}

async function mapArticle(ctx: QueryCtx, article: Doc<"articles">) {
  return {
    _id: article._id,
    source: "cms" as const,
    title: article.title,
    slug: article.slug,
    content: article.excerpt || article.content.substring(0, 220),
    contentHtml: article.excerpt || "",
    imageUrl: article.imageStorageId
      ? await ctx.storage.getUrl(article.imageStorageId)
      : null,
    imageUrls: [] as (string | null)[],
    postType: "article" as const,
    publishedAt: article.publishedAt || 0,
    category: article.category,
    teamId: article.teamId,
    engagement: null,
    url: `/aktualnosci/${article.slug}`,
    isPinned: false,
  };
}

// Articles may lack publishedAt (older drafts published without a date), so
// ordering falls back to _creationTime.
function articleTs(article: Doc<"articles">) {
  return article.publishedAt ?? article._creationTime;
}

export const getUnifiedFeed = query({
  args: {
    limit: v.optional(v.number()),
    source: v.optional(
      v.union(v.literal("all"), v.literal("facebook"), v.literal("cms")),
    ),
    teamId: v.optional(v.id("teams")),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 12;
    const source = args.source || "all";
    const items = [];

    if (source !== "cms") {
      const category = args.category;
      const posts = category
        ? (
            await ctx.db
              .query("fbPosts")
              .withIndex("by_category", (q) =>
                q.eq("category", category as Infer<typeof fbCategory>),
              )
              .order("desc")
              .take(limit + 10)
          )
            .filter((post) => !post.isHidden)
            .slice(0, limit)
        : await ctx.db
            .query("fbPosts")
            .withIndex("by_hidden", (q) => q.eq("isHidden", false))
            .order("desc")
            .take(limit);

      for (const post of posts) {
        if (args.teamId && post.teamId !== args.teamId) continue;
        if (args.category && post.category !== args.category) continue;
        items.push(await mapFbPost(ctx, post));
      }
    }

    if (source !== "facebook") {
      const articles = await ctx.db
        .query("articles")
        .withIndex("by_status", (q) => q.eq("status", "published"))
        .order("desc")
        .take(limit);

      for (const article of articles) {
        if (args.teamId && article.teamId !== args.teamId) continue;
        if (args.category && article.category !== args.category) continue;
        items.push(await mapArticle(ctx, article));
      }
    }

    return items
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.publishedAt - a.publishedAt;
      })
      .slice(0, limit);
  },
});

export const getNewsFeedPage = query({
  args: {
    numItems: v.number(),
    cursor: v.union(v.number(), v.null()),
    category: v.optional(v.string()),
    monthStart: v.optional(v.number()),
    monthEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const numItems = Math.min(Math.max(Math.floor(args.numItems), 1), 50);
    // Fetch one extra row per source to know whether another page exists.
    const fetchCount = numItems + 1;
    const before = Math.min(args.cursor ?? Infinity, args.monthEnd ?? Infinity);
    const hasBefore = Number.isFinite(before);
    const after = args.monthStart;
    const category = args.category as Infer<typeof fbCategory> | undefined;

    const posts = category
      ? await ctx.db
          .query("fbPosts")
          .withIndex("by_category", (q) => {
            const base = q.eq("category", category);
            if (after !== undefined && hasBefore)
              return base.gte("publishedAt", after).lt("publishedAt", before);
            if (after !== undefined) return base.gte("publishedAt", after);
            if (hasBefore) return base.lt("publishedAt", before);
            return base;
          })
          .filter((q) => q.eq(q.field("isHidden"), false))
          .order("desc")
          .take(fetchCount)
      : await ctx.db
          .query("fbPosts")
          .withIndex("by_hidden", (q) => {
            const base = q.eq("isHidden", false);
            if (after !== undefined && hasBefore)
              return base.gte("publishedAt", after).lt("publishedAt", before);
            if (after !== undefined) return base.gte("publishedAt", after);
            if (hasBefore) return base.lt("publishedAt", before);
            return base;
          })
          .order("desc")
          .take(fetchCount);

    // The articles table is small (CMS-managed) and publishedAt can be
    // missing, so date bounds and category are applied after the index scan.
    const articleDocs = await ctx.db
      .query("articles")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc")
      .take(200);

    const articles = articleDocs.filter((article) => {
      const ts = articleTs(article);
      if (hasBefore && ts >= before) return false;
      if (after !== undefined && ts < after) return false;
      if (args.category !== undefined && article.category !== args.category)
        return false;
      return true;
    });

    const merged = [
      ...posts.map((doc) => ({
        kind: "post" as const,
        ts: doc.publishedAt,
        doc,
      })),
      ...articles.map((doc) => ({
        kind: "article" as const,
        ts: articleTs(doc),
        doc,
      })),
    ].sort((a, b) => b.ts - a.ts);

    const isDone = merged.length <= numItems;
    const pageEntries = merged.slice(0, numItems);
    // Cursor = bottom of the contiguous time window this page covers. It must
    // be computed before the pinned re-sort below so no items get skipped.
    const continueCursor =
      pageEntries.length > 0 ? pageEntries[pageEntries.length - 1].ts : null;

    if (args.cursor === null) {
      // Float pinned posts to the top of the first page only. Pinned posts
      // outside the first page's window keep their natural position, matching
      // the previous unpaginated feed behavior.
      pageEntries.sort((a, b) => {
        const aPinned = a.kind === "post" && a.doc.isPinned;
        const bPinned = b.kind === "post" && b.doc.isPinned;
        if (aPinned !== bPinned) return aPinned ? -1 : 1;
        return b.ts - a.ts;
      });
    }

    const page = await Promise.all(
      pageEntries.map((entry) =>
        entry.kind === "post"
          ? mapFbPost(ctx, entry.doc)
          : mapArticle(ctx, entry.doc),
      ),
    );

    return { page, isDone, continueCursor };
  },
});

export const getNewsArchiveRange = query({
  args: {},
  handler: async (ctx) => {
    const oldestPost = await ctx.db
      .query("fbPosts")
      .withIndex("by_hidden", (q) => q.eq("isHidden", false))
      .order("asc")
      .first();
    const oldestArticle = await ctx.db
      .query("articles")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("asc")
      .first();

    const candidates: number[] = [];
    if (oldestPost) candidates.push(oldestPost.publishedAt);
    if (oldestArticle) candidates.push(articleTs(oldestArticle));

    return {
      oldestPublishedAt: candidates.length > 0 ? Math.min(...candidates) : null,
    };
  },
});

export const getPostBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const post = await ctx.db
      .query("fbPosts")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (post && !post.isHidden) {
      return {
        source: "facebook" as const,
        content: post.content,
        contentHtml: post.contentHtml,
        imageUrl: post.imageStorageId
          ? await ctx.storage.getUrl(post.imageStorageId)
          : null,
        imageUrls: post.imageIds
          ? await Promise.all(post.imageIds.map((id) => ctx.storage.getUrl(id)))
          : [],
        postType: post.postType,
        videoUrl: post.videoUrl,
        publishedAt: post.publishedAt,
        category: post.category,
      };
    }

    const article = await ctx.db
      .query("articles")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (article && article.status === "published") {
      return {
        source: "cms" as const,
        title: article.title,
        content: article.content,
        contentHtml: article.contentHtml,
        imageUrl: article.imageStorageId
          ? await ctx.storage.getUrl(article.imageStorageId)
          : null,
        imageUrls: article.galleryIds
          ? await Promise.all(
              article.galleryIds.map((id) => ctx.storage.getUrl(id)),
            )
          : ([] as (string | null)[]),
        postType: "article",
        videoUrl: undefined,
        publishedAt: article.publishedAt || 0,
        category: article.category,
      };
    }

    return null;
  },
});

export const getLatestFbPosts = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const posts = await ctx.db
      .query("fbPosts")
      .withIndex("by_hidden", (q) => q.eq("isHidden", false))
      .order("desc")
      .take(args.limit || 6);

    return Promise.all(
      posts.map(async (post) => ({
        ...post,
        imageUrl: post.imageStorageId
          ? await ctx.storage.getUrl(post.imageStorageId)
          : null,
        imageUrls: post.imageIds
          ? await Promise.all(post.imageIds.map((id) => ctx.storage.getUrl(id)))
          : [],
      })),
    );
  },
});
