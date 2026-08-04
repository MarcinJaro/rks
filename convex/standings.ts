import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

const standingsRow = v.object({
  position: v.number(),
  name: v.string(),
  played: v.number(),
  points: v.number(),
  wins: v.number(),
  draws: v.number(),
  losses: v.number(),
  goalsFor: v.number(),
  goalsAgainst: v.number(),
  isRks: v.boolean(),
});

export const replace = internalMutation({
  args: {
    teamId: v.id("teams"),
    competitionName: v.string(),
    season: v.string(),
    rows: v.array(standingsRow),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.rows.length === 0) {
      throw new Error("Tabela jest pusta — pomijam zapis.");
    }

    const existing = await ctx.db
      .query("standings")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .first();

    const fields = {
      teamId: args.teamId,
      competitionName: args.competitionName,
      season: args.season,
      rows: args.rows,
      sourceUrl: args.sourceUrl,
      syncedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, fields);
      return existing._id;
    }

    return await ctx.db.insert("standings", fields);
  },
});

export const byTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, { teamId }) => {
    return await ctx.db
      .query("standings")
      .withIndex("by_team", (q) => q.eq("teamId", teamId))
      .first();
  },
});
