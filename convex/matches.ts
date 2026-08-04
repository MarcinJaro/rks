import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { v } from "convex/values";

import { requireAdmin } from "./adminAuth";

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
  v.literal("ninetyminut"),
  v.literal("lnp"),
  v.literal("futbolowo"),
  v.literal("regionalnyfutbol"),
  v.literal("virium"),
  v.literal("manual"),
);

// Mecze bez wyznaczonego terminu dostają godzinę 12:00 pierwszego dnia kolejki,
// a bywają rozgrywane dzień lub kilka dni później. Trzymamy je w terminarzu
// przez tydzień od tej daty, żeby nie znikały ze strony w dniu meczu.
const APPROXIMATE_DATE_GRACE = 7 * 24 * 60 * 60 * 1000;

// Zapas wierszy na mecze z drugiego końca zakresu (rozegrane w oknie
// tolerancji albo nierozegrane mimo minionego terminu), które odpadną
// przy filtrowaniu po statusie.
const SCAN_MARGIN = 20;

function isStillUpcoming(
  match: { date: number; dateConfirmed?: boolean },
  now: number,
) {
  const deadline =
    match.dateConfirmed === false
      ? match.date + APPROXIMATE_DATE_GRACE
      : match.date;
  return deadline >= now;
}

export const upcoming = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const now = Date.now();
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_status", (q) => q.eq("status", "upcoming"))
      .order("asc")
      .take(limit || 10);

    return matches.filter((match) => isStillUpcoming(match, now));
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
      upcomingMatches.find((match) => isStillUpcoming(match, now)) ||
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
    teamSlug: v.optional(v.string()),
  },
  handler: async (ctx, { upcomingLimit, latestLimit, teamSlug }) => {
    const now = Date.now();
    const team = teamSlug
      ? await ctx.db
          .query("teams")
          .withIndex("by_slug", (q) => q.eq("slug", teamSlug))
          .first()
      : null;

    if (teamSlug && !team) {
      return { nextMatch: null, upcoming: [], latestResults: [] };
    }

    const upcomingCount = upcomingLimit || 8;
    const resultsCount = latestLimit || 8;

    // Terminarz drużyny czytamy zakresem po dacie, a nie od początku
    // istnienia klubu: po pierwszym sezonie 30 najstarszych meczów to same
    // wyniki i drużyna zostawała bez nadchodzących spotkań. Dolna granica
    // cofa się o tolerancję terminów orientacyjnych, żeby mecz z kolejki
    // sprzed kilku dni nie wypadł z zakresu.
    const upcomingMatches = team
      ? (
          await ctx.db
            .query("matches")
            .withIndex("by_team", (q) =>
              q
                .eq("teamId", team._id)
                .gte("date", now - APPROXIMATE_DATE_GRACE),
            )
            .order("asc")
            .take(upcomingCount + SCAN_MARGIN)
        )
          .filter((match) => match.status === "upcoming")
          .slice(0, upcomingCount)
      : await ctx.db
          .query("matches")
          .withIndex("by_status", (q) => q.eq("status", "upcoming"))
          .order("asc")
          .take(upcomingCount);

    const upcoming = upcomingMatches.filter((match) =>
      isStillUpcoming(match, now),
    );
    const nextMatch = upcoming[0] || upcomingMatches[0] || null;

    // Symetrycznie dla wyników: bez górnej granicy pełny terminarz przyszłych
    // kolejek wypychał rozegrane mecze poza okno odczytu.
    const latestResults = team
      ? (
          await ctx.db
            .query("matches")
            .withIndex("by_team", (q) =>
              q.eq("teamId", team._id).lte("date", now),
            )
            .order("desc")
            .take(resultsCount + SCAN_MARGIN)
        )
          .filter((match) => match.status === "finished")
          .slice(0, resultsCount)
      : await ctx.db
          .query("matches")
          .withIndex("by_status", (q) => q.eq("status", "finished"))
          .order("desc")
          .take(resultsCount);

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

export const upsertFromSource = internalMutation({
  args: {
    source: matchSource,
    sourceMatchId: v.string(),
    sourceTeamId: v.optional(v.string()),
    sourceCompetitionId: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    homeTeam: v.string(),
    awayTeam: v.string(),
    date: v.number(),
    dateConfirmed: v.optional(v.boolean()),
    roundLabel: v.optional(v.string()),
    venue: v.optional(v.string()),
    result: v.optional(v.string()),
    matchType,
    status: matchStatus,
    teamId: v.optional(v.id("teams")),
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
      dateConfirmed: args.dateConfirmed,
      roundLabel: args.roundLabel,
      venue: args.venue,
      result: args.result,
      matchType: args.matchType,
      status: args.status,
      source: args.source,
      sourceMatchId: args.sourceMatchId,
      sourceTeamId: args.sourceTeamId,
      sourceCompetitionId: args.sourceCompetitionId,
      sourceUrl: args.sourceUrl,
      teamId: args.teamId,
      syncedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, fields);
      return existing._id;
    }

    return await ctx.db.insert("matches", fields);
  },
});

export const adminList = query({
  args: {
    teamId: v.optional(v.id("teams")),
    status: v.optional(matchStatus),
  },
  handler: async (ctx, { teamId, status }) => {
    await requireAdmin(ctx);
    let matches;
    if (teamId) {
      let teamMatches = await ctx.db
        .query("matches")
        .withIndex("by_team", (q) => q.eq("teamId", teamId))
        .order("desc")
        .collect();
      if (status) {
        teamMatches = teamMatches.filter((m) => m.status === status);
      }
      matches = teamMatches.slice(0, 200);
    } else if (status) {
      matches = await ctx.db
        .query("matches")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .take(200);
    } else {
      matches = await ctx.db
        .query("matches")
        .withIndex("by_date")
        .order("desc")
        .take(200);
    }
    return matches;
  },
});

export const createManual = mutation({
  args: {
    homeTeam: v.string(),
    awayTeam: v.string(),
    date: v.number(),
    venue: v.optional(v.string()),
    matchType,
    status: matchStatus,
    teamId: v.optional(v.id("teams")),
    result: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!args.homeTeam.trim() || !args.awayTeam.trim()) {
      throw new Error("Podaj nazwy obu drużyn");
    }
    return await ctx.db.insert("matches", { ...args, source: "manual" });
  },
});

export const update = mutation({
  args: {
    id: v.id("matches"),
    homeTeam: v.optional(v.string()),
    awayTeam: v.optional(v.string()),
    date: v.optional(v.number()),
    venue: v.optional(v.union(v.string(), v.null())),
    matchType: v.optional(matchType),
    status: v.optional(matchStatus),
    teamId: v.optional(v.union(v.id("teams"), v.null())),
    result: v.optional(v.union(v.string(), v.null())),
    veoUrl: v.optional(v.union(v.string(), v.null())),
    youtubeUrl: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    const match = await ctx.db.get(id);
    if (!match) throw new Error("Nie znaleziono meczu");
    const patch = Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [
        key,
        value === null ? undefined : value,
      ]),
    );
    await ctx.db.patch(id, patch);
  },
});

export const adminMatchOptions = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    // Okno „najbliższy tydzień + niedawne mecze" — bez tego dzisiejszy mecz
    // wypada z top-30 przy pełnym terminarzu ligowym kilku drużyn.
    const weekAhead = Date.now() + 7 * 24 * 60 * 60 * 1000;
    return await ctx.db
      .query("matches")
      .withIndex("by_date", (q) => q.lte("date", weekAhead))
      .order("desc")
      .take(30);
  },
});

export const removeMatch = mutation({
  args: { id: v.id("matches") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});
