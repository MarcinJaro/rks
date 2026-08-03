import { query } from "./_generated/server";
import { v } from "convex/values";

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
      const posts = await ctx.db
        .query("fbPosts")
        .withIndex("by_hidden", (q) => q.eq("isHidden", false))
        .order("desc")
        .take(limit);

      for (const post of posts) {
        if (args.teamId && post.teamId !== args.teamId) continue;
        if (args.category && post.category !== args.category) continue;

        items.push({
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
        });
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

        items.push({
          _id: article._id,
          source: "cms" as const,
          title: article.title,
          slug: article.slug,
          content: article.excerpt || article.content.substring(0, 220),
          contentHtml: article.excerpt || "",
          imageUrl: article.imageStorageId
            ? await ctx.storage.getUrl(article.imageStorageId)
            : null,
          imageUrls: [],
          postType: "article" as const,
          publishedAt: article.publishedAt || 0,
          category: article.category,
          teamId: article.teamId,
          engagement: null,
          url: `/aktualnosci/${article.slug}`,
          isPinned: false,
        });
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
      .filter((q) => q.eq(q.field("slug"), slug))
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
        imageUrls: [] as (string | null)[],
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
