import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { fbCategory, fbPostType } from "../schema";

type FacebookAttachment = {
  media?: { image?: { src?: string } };
  media_type?: string;
  type?: string;
  subattachments?: { data?: FacebookAttachment[] };
  url?: string;
  title?: string;
  description?: string;
};

type FacebookPost = {
  id: string;
  message?: string;
  story?: string;
  full_picture?: string;
  attachments?: { data?: FacebookAttachment[] };
  created_time: string;
  updated_time?: string;
  permalink_url: string;
  shares?: { count?: number };
  reactions?: { summary?: { total_count?: number } };
  comments?: { summary?: { total_count?: number } };
};

type PostType = "text" | "photo" | "album" | "video" | "link" | "event";
type Category = "mecz" | "trening" | "turniej" | "ogłoszenie" | "wydarzenie";

export const syncFromFacebook = internalAction({
  handler: async (ctx) => {
    const pageId = process.env.FB_PAGE_ID;
    const accessToken = process.env.FB_PAGE_ACCESS_TOKEN;
    const apiVersion = process.env.FB_GRAPH_API_VERSION || "v22.0";

    if (!pageId || !accessToken) {
      return {
        success: false,
        error: "Missing FB_PAGE_ID or FB_PAGE_ACCESS_TOKEN in Convex env vars.",
      };
    }

    const fields = [
      "id",
      "message",
      "story",
      "full_picture",
      "attachments{media,media_type,type,subattachments,url,title,description}",
      "created_time",
      "updated_time",
      "permalink_url",
      "shares",
      "reactions.summary(true)",
      "comments.summary(true)",
    ].join(",");

    const url =
      `https://graph.facebook.com/${apiVersion}/${pageId}/feed` +
      `?fields=${encodeURIComponent(fields)}&limit=25&access_token=${accessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error("FB API Error:", data.error);
      return { success: false, error: data.error.message };
    }

    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const post of (data.data || []) as FacebookPost[]) {
      try {
        const existing = await ctx.runQuery(
          internal.facebook.sync.getByFbPostId,
          { fbPostId: post.id },
        );

        let imageStorageId = existing?.imageStorageId;
        if (post.full_picture && !existing) {
          imageStorageId = await storeRemoteImage(ctx, post.full_picture);
        }

        const imageIds = existing?.imageIds ? [...existing.imageIds] : [];
        if (!existing && post.attachments?.data) {
          for (const att of post.attachments.data) {
            for (const sub of att.subattachments?.data || []) {
              const src = sub.media?.image?.src;
              if (!src) continue;
              const id = await storeRemoteImage(ctx, src);
              if (id) imageIds.push(id);
            }
          }
        }

        const postType = determinePostType(post);
        const content = post.message || post.story;
        const contentHtml = parseMessageToHtml(content || "");
        const { category, teamSlug } = categorizePost(content || "");
        const firstAttachment = post.attachments?.data?.[0];

        let teamId;
        if (teamSlug) {
          const team = await ctx.runQuery(internal.facebook.sync.getTeamBySlug, {
            slug: teamSlug,
          });
          teamId = team?._id;
        }

        if (existing) {
          await ctx.runMutation(internal.facebook.sync.updatePost, {
            id: existing._id,
            content,
            contentHtml,
            reactionsCount: post.reactions?.summary?.total_count || 0,
            commentsCount: post.comments?.summary?.total_count || 0,
            sharesCount: post.shares?.count || 0,
            fbUpdatedAt: post.updated_time
              ? new Date(post.updated_time).getTime()
              : undefined,
            syncedAt: Date.now(),
          });
          updated++;
        } else {
          await ctx.runMutation(internal.facebook.sync.insertPost, {
            fbPostId: post.id,
            content,
            contentHtml,
            postType,
            imageStorageId,
            imageIds: imageIds.length > 0 ? imageIds : undefined,
            videoUrl: postType === "video" ? firstAttachment?.url : undefined,
            linkUrl: postType === "link" ? firstAttachment?.url : undefined,
            linkTitle: firstAttachment?.title,
            linkDescription: firstAttachment?.description,
            reactionsCount: post.reactions?.summary?.total_count || 0,
            commentsCount: post.comments?.summary?.total_count || 0,
            sharesCount: post.shares?.count || 0,
            teamId,
            category,
            fbUrl: post.permalink_url,
            publishedAt: new Date(post.created_time).getTime(),
            fbUpdatedAt: post.updated_time
              ? new Date(post.updated_time).getTime()
              : undefined,
            syncedAt: Date.now(),
          });
          created++;
        }
      } catch (error) {
        console.error(`Error processing FB post ${post.id}:`, error);
        errors++;
      }
    }

    return { success: true, created, updated, errors };
  },
});

export const triggerFacebookSync = action({
  handler: async (ctx) => {
    return await ctx.runAction(internal.facebook.sync.syncFromFacebook);
  },
});

export const getByFbPostId = internalQuery({
  args: { fbPostId: v.string() },
  handler: async (ctx, { fbPostId }) => {
    return await ctx.db
      .query("fbPosts")
      .withIndex("by_fbPostId", (q) => q.eq("fbPostId", fbPostId))
      .first();
  },
});

export const getTeamBySlug = internalQuery({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
  },
});

export const insertPost = internalMutation({
  args: {
    fbPostId: v.string(),
    content: v.optional(v.string()),
    contentHtml: v.optional(v.string()),
    postType: fbPostType,
    imageStorageId: v.optional(v.id("_storage")),
    imageIds: v.optional(v.array(v.id("_storage"))),
    videoUrl: v.optional(v.string()),
    linkUrl: v.optional(v.string()),
    linkTitle: v.optional(v.string()),
    linkDescription: v.optional(v.string()),
    reactionsCount: v.number(),
    commentsCount: v.number(),
    sharesCount: v.number(),
    teamId: v.optional(v.id("teams")),
    category: v.optional(fbCategory),
    fbUrl: v.string(),
    publishedAt: v.number(),
    fbUpdatedAt: v.optional(v.number()),
    syncedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("fbPosts", {
      ...args,
      isPinned: false,
      isHidden: false,
    });
  },
});

export const updatePost = internalMutation({
  args: {
    id: v.id("fbPosts"),
    content: v.optional(v.string()),
    contentHtml: v.optional(v.string()),
    reactionsCount: v.number(),
    commentsCount: v.number(),
    sharesCount: v.number(),
    fbUpdatedAt: v.optional(v.number()),
    syncedAt: v.number(),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
  },
});

async function storeRemoteImage(ctx: {
  storage: { store: (blob: Blob) => Promise<string> };
}, url: string) {
  try {
    const imgResponse = await fetch(url);
    if (!imgResponse.ok) return undefined;
    const imgBlob = await imgResponse.blob();
    return await ctx.storage.store(imgBlob);
  } catch (error) {
    console.error("Failed to store remote FB image:", error);
    return undefined;
  }
}

function determinePostType(post: FacebookPost): PostType {
  const att = post.attachments?.data?.[0];
  if (!att) return post.full_picture ? "photo" : "text";
  if (att.type === "event") return "event";
  if (att.type === "album" || att.subattachments) return "album";
  if (att.media_type === "video") return "video";
  if (att.type === "share") return "link";
  if (att.media_type === "photo") return "photo";
  return "text";
}

function parseMessageToHtml(message: string) {
  return escapeHtml(message)
    .replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>',
    )
    .replace(/(^|\s)#([\p{L}\p{N}_-]+)/gu, '$1<span class="hashtag">#$2</span>')
    .replace(/\n/g, "<br>");
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function categorizePost(message: string): {
  category: Category;
  teamSlug: string | undefined;
} {
  const text = message.toLowerCase();
  const year = text.match(/rocznik\s*(20\d{2})/i)?.[1];

  if (year) return { category: "mecz", teamSlug: `rocznik-${year}` };
  if (/senior|liga okręgowa|b klasa/i.test(text)) {
    return { category: "mecz", teamSlug: "seniorzy" };
  }
  if (/sparing|mecz|kol\.|kolejka|wynik|bramki|skład/i.test(text)) {
    return { category: "mecz", teamSlug: undefined };
  }
  if (/trening|zajęcia|nabór/i.test(text)) {
    return { category: "trening", teamSlug: undefined };
  }
  if (/turniej|cup|puchar/i.test(text)) {
    return { category: "turniej", teamSlug: undefined };
  }
  if (/wydarzenie|zapraszamy|spotkanie/i.test(text)) {
    return { category: "wydarzenie", teamSlug: undefined };
  }

  return { category: "ogłoszenie", teamSlug: undefined };
}
