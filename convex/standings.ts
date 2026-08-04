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
    sourceId: v.id("syncSources"),
    competitionName: v.string(),
    season: v.string(),
    rows: v.array(standingsRow),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.rows.length === 0) {
      throw new Error("Tabela jest pusta — pomijam zapis.");
    }

    // Klucz to źródło, nie drużyna: liga i puchar tej samej drużyny
    // mają własne tabele i nie mogą się nawzajem nadpisywać.
    const existing = await ctx.db
      .query("standings")
      .withIndex("by_source", (q) => q.eq("sourceId", args.sourceId))
      .first();

    const fields = {
      teamId: args.teamId,
      sourceId: args.sourceId,
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

// Publicznie pokazujemy jedną tabelę na drużynę — tę z rozgrywek ligowych.
// Tabele pucharowe czy turniejowe są dodatkiem i nie mogą jej wypierać.
export const byTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, { teamId }) => {
    const tables = await ctx.db
      .query("standings")
      .withIndex("by_team", (q) => q.eq("teamId", teamId))
      .take(10);

    if (tables.length <= 1) return tables[0] ?? null;

    for (const table of tables) {
      const source = await ctx.db.get(table.sourceId);
      if (source?.matchType === "liga") return table;
    }

    return tables[0];
  },
});
