import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const fbCategory = v.union(
  v.literal("mecz"),
  v.literal("trening"),
  v.literal("turniej"),
  v.literal("ogłoszenie"),
  v.literal("wydarzenie"),
);

export const fbPostType = v.union(
  v.literal("text"),
  v.literal("photo"),
  v.literal("album"),
  v.literal("video"),
  v.literal("link"),
  v.literal("event"),
);

export default defineSchema({
  fbPosts: defineTable({
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
    isPinned: v.boolean(),
    isHidden: v.boolean(),
    fbUrl: v.string(),
    publishedAt: v.number(),
    fbUpdatedAt: v.optional(v.number()),
    syncedAt: v.number(),
  })
    .index("by_fbPostId", ["fbPostId"])
    .index("by_publishedAt", ["publishedAt"])
    .index("by_team", ["teamId", "publishedAt"])
    .index("by_category", ["category", "publishedAt"])
    .index("by_hidden", ["isHidden", "publishedAt"]),

  articles: defineTable({
    title: v.string(),
    slug: v.string(),
    content: v.string(),
    contentHtml: v.string(),
    excerpt: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    galleryIds: v.optional(v.array(v.id("_storage"))),
    youtubeUrl: v.optional(v.string()),
    teamId: v.optional(v.id("teams")),
    category: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("published")),
    publishedAt: v.optional(v.number()),
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    ogImageStorageId: v.optional(v.id("_storage")),
  })
    .index("by_slug", ["slug"])
    .index("by_publishedAt", ["publishedAt"])
    .index("by_team", ["teamId", "publishedAt"])
    .index("by_status", ["status", "publishedAt"]),

  teams: defineTable({
    name: v.string(),
    slug: v.string(),
    yearGroup: v.optional(v.number()),
    league: v.optional(v.string()),
    groupPhotoId: v.optional(v.id("_storage")),
    coachId: v.optional(v.id("people")),
    schedule: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    sortOrder: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_sortOrder", ["sortOrder"]),

  people: defineTable({
    name: v.string(),
    role: v.union(
      v.literal("trener"),
      v.literal("zarząd"),
      v.literal("legenda"),
      v.literal("zasłużony"),
    ),
    position: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
    teamId: v.optional(v.id("teams")),
    qualifications: v.optional(v.string()),
    bio: v.optional(v.string()),
    sortOrder: v.number(),
  })
    .index("by_role", ["role", "sortOrder"])
    .index("by_team", ["teamId"]),

  matches: defineTable({
    homeTeam: v.string(),
    awayTeam: v.string(),
    date: v.number(),
    venue: v.optional(v.string()),
    result: v.optional(v.string()),
    source: v.optional(
      v.union(
        v.literal("manual"),
        v.literal("lnp"),
        v.literal("futbolowo"),
        v.literal("regionalnyfutbol"),
        v.literal("virium"),
      ),
    ),
    sourceMatchId: v.optional(v.string()),
    sourceTeamId: v.optional(v.string()),
    sourceCompetitionId: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    syncedAt: v.optional(v.number()),
    teamId: v.optional(v.id("teams")),
    matchType: v.union(
      v.literal("liga"),
      v.literal("sparing"),
      v.literal("turniej"),
      v.literal("puchar"),
    ),
    status: v.union(
      v.literal("upcoming"),
      v.literal("live"),
      v.literal("finished"),
    ),
    articleId: v.optional(v.id("articles")),
  })
    .index("by_date", ["date"])
    .index("by_team", ["teamId", "date"])
    .index("by_status", ["status", "date"])
    .index("by_sourceMatchId", ["sourceMatchId"]),

  matchEvents: defineTable({
    matchId: v.id("matches"),
    sourceEventId: v.optional(v.string()),
    sourcePlayerId: v.optional(v.string()),
    playerName: v.optional(v.string()),
    teamSide: v.optional(v.union(v.literal("home"), v.literal("away"))),
    type: v.union(
      v.literal("goal"),
      v.literal("assist"),
      v.literal("yellowCard"),
      v.literal("redCard"),
      v.literal("other"),
    ),
    minute: v.optional(v.number()),
    syncedAt: v.optional(v.number()),
  })
    .index("by_match", ["matchId"])
    .index("by_sourceEventId", ["sourceEventId"]),

  sponsors: defineTable({
    name: v.string(),
    logoStorageId: v.id("_storage"),
    url: v.optional(v.string()),
    type: v.union(v.literal("sponsor"), v.literal("partner")),
    sortOrder: v.number(),
  }).index("by_type", ["type", "sortOrder"]),

  pages: defineTable({
    title: v.string(),
    slug: v.string(),
    content: v.string(),
    contentHtml: v.string(),
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
  }).index("by_slug", ["slug"]),

  galleries: defineTable({
    title: v.string(),
    slug: v.string(),
    imageIds: v.array(v.id("_storage")),
    teamId: v.optional(v.id("teams")),
    date: v.number(),
    description: v.optional(v.string()),
  })
    .index("by_date", ["date"])
    .index("by_team", ["teamId"]),

  documents: defineTable({
    title: v.string(),
    fileStorageId: v.id("_storage"),
    category: v.string(),
    sortOrder: v.number(),
  }),

  settings: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),
});
