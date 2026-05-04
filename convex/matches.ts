import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";

const matchType = v.union(
  v.literal("liga"),
  v.literal("sparing"),
  v.literal("turniej"),
  v.literal("puchar"),
);

const matchStatus = v.union(
  v.literal("upcoming"),
  v.literal("live"),
  v.literal("finished"),
);

const matchSource = v.union(
  v.literal("lnp"),
  v.literal("futbolowo"),
  v.literal("manual"),
);

export const upcoming = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const now = Date.now();
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_status", (q) => q.eq("status", "upcoming"))
      .order("asc")
      .take(limit || 10);

    return matches.filter((match) => match.date >= now);
  },
});

export const homepage = query({
  args: { latestLimit: v.optional(v.number()) },
  handler: async (ctx, { latestLimit }) => {
    const now = Date.now();
    const upcomingMatches = await ctx.db
      .query("matches")
      .withIndex("by_status", (q) => q.eq("status", "upcoming"))
      .order("asc")
      .take(12);

    const nextMatch =
      upcomingMatches.find((match) => match.date >= now) ||
      upcomingMatches[0] ||
      null;

    const latestResults = await ctx.db
      .query("matches")
      .withIndex("by_status", (q) => q.eq("status", "finished"))
      .order("desc")
      .take(latestLimit || 3);

    return { nextMatch, latestResults };
  },
});

export const center = query({
  args: {
    upcomingLimit: v.optional(v.number()),
    latestLimit: v.optional(v.number()),
  },
  handler: async (ctx, { upcomingLimit, latestLimit }) => {
    const now = Date.now();
    const upcomingMatches = await ctx.db
      .query("matches")
      .withIndex("by_status", (q) => q.eq("status", "upcoming"))
      .order("asc")
      .take(upcomingLimit || 8);

    const upcoming = upcomingMatches.filter((match) => match.date >= now);
    const nextMatch = upcoming[0] || upcomingMatches[0] || null;

    const latestResults = await ctx.db
      .query("matches")
      .withIndex("by_status", (q) => q.eq("status", "finished"))
      .order("desc")
      .take(latestLimit || 8);

    return { nextMatch, upcoming, latestResults };
  },
});

export const latestResults = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    return await ctx.db
      .query("matches")
      .withIndex("by_status", (q) => q.eq("status", "finished"))
      .order("desc")
      .take(limit || 10);
  },
});

export const getBySourceMatchId = internalQuery({
  args: { sourceMatchId: v.string() },
  handler: async (ctx, { sourceMatchId }) => {
    return await ctx.db
      .query("matches")
      .withIndex("by_sourceMatchId", (q) => q.eq("sourceMatchId", sourceMatchId))
      .first();
  },
});

export const upsertFromLnp = internalMutation({
  args: {
    sourceMatchId: v.string(),
    homeTeam: v.string(),
    awayTeam: v.string(),
    date: v.number(),
    venue: v.optional(v.string()),
    result: v.optional(v.string()),
    matchType,
    status: matchStatus,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("matches")
      .withIndex("by_sourceMatchId", (q) =>
        q.eq("sourceMatchId", args.sourceMatchId),
      )
      .first();

    const fields = {
      homeTeam: args.homeTeam,
      awayTeam: args.awayTeam,
      date: args.date,
      venue: args.venue,
      result: args.result,
      matchType: args.matchType,
      status: args.status,
      source: "lnp" as const,
      sourceMatchId: args.sourceMatchId,
      syncedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, fields);
      return existing._id;
    }

    return await ctx.db.insert("matches", fields);
  },
});

export const upsertFromSource = internalMutation({
  args: {
    source: matchSource,
    sourceMatchId: v.string(),
    homeTeam: v.string(),
    awayTeam: v.string(),
    date: v.number(),
    venue: v.optional(v.string()),
    result: v.optional(v.string()),
    matchType,
    status: matchStatus,
    teamSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("matches")
      .withIndex("by_sourceMatchId", (q) =>
        q.eq("sourceMatchId", args.sourceMatchId),
      )
      .first();

    const team = args.teamSlug
      ? await ctx.db
          .query("teams")
          .withIndex("by_slug", (q) => q.eq("slug", args.teamSlug!))
          .first()
      : null;

    const fields = {
      homeTeam: args.homeTeam,
      awayTeam: args.awayTeam,
      date: args.date,
      venue: args.venue,
      result: args.result,
      matchType: args.matchType,
      status: args.status,
      source: args.source,
      sourceMatchId: args.sourceMatchId,
      teamId: team?._id,
      syncedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, fields);
      return existing._id;
    }

    return await ctx.db.insert("matches", fields);
  },
});
