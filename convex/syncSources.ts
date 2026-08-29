import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { requireAdmin } from "./adminAuth";
import { parseLeagueIdFromUrl } from "./sources/ninetyMinut";
import { parseViriumTeamIdFromUrl } from "./sources/virium";

const matchType = v.union(
  v.literal("liga"),
  v.literal("sparing"),
  v.literal("turniej"),
  v.literal("puchar"),
);

export function detectSource(url: string) {
  const leagueId = parseLeagueIdFromUrl(url);
  if (leagueId) return { kind: "ninetyminut" as const, externalId: leagueId };

  const viriumId = parseViriumTeamIdFromUrl(url);
  if (viriumId) return { kind: "virium" as const, externalId: viriumId };

  return null;
}

export const listByTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, { teamId }) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("syncSources")
      .withIndex("by_team", (q) => q.eq("teamId", teamId))
      .collect();
  },
});

export const listEnabled = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("syncSources")
      .filter((q) => q.eq(q.field("enabled"), true))
      .collect();
  },
});

export const add = mutation({
  args: {
    teamId: v.id("teams"),
    url: v.string(),
    teamNameOnSource: v.string(),
    matchType,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const detected = detectSource(args.url);
    if (!detected) {
      throw new Error(
        "Nieobsługiwany adres. Wklej link do ligi na 90minut.pl lub do drużyny na virium.pl.",
      );
    }

    // Duplikat źródła prowadzi do naprzemiennego nadpisywania meczów - ta sama
    // liga może istnieć dla dwóch drużyn klubu tylko z różnymi nazwami zespołu.
    const all = await ctx.db.query("syncSources").collect();
    for (const source of all) {
      if (source.kind !== detected.kind || source.externalId !== detected.externalId) {
        continue;
      }
      if (source.teamId === args.teamId) {
        throw new Error(
          "Ta drużyna ma już skonfigurowane to źródło. Usuń stare źródło albo zmień jego ustawienia.",
        );
      }
      if (source.teamNameOnSource.trim().toLowerCase() === args.teamNameOnSource.trim().toLowerCase()) {
        throw new Error(
          "To źródło z tą samą nazwą drużyny jest już przypisane innej drużynie.",
        );
      }
    }

    return await ctx.db.insert("syncSources", {
      teamId: args.teamId,
      kind: detected.kind,
      url: args.url,
      externalId: detected.externalId,
      teamNameOnSource: args.teamNameOnSource,
      matchType: args.matchType,
      enabled: true,
    });
  },
});

export const update = mutation({
  args: {
    sourceId: v.id("syncSources"),
    enabled: v.optional(v.boolean()),
    teamNameOnSource: v.optional(v.string()),
    matchType: v.optional(matchType),
  },
  handler: async (ctx, { sourceId, ...fields }) => {
    await requireAdmin(ctx);
    const patch = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined),
    );
    await ctx.db.patch(sourceId, patch);
  },
});

export const remove = mutation({
  args: { sourceId: v.id("syncSources") },
  handler: async (ctx, { sourceId }) => {
    await requireAdmin(ctx);
    // Tabela ligowa źródła znika razem z nim - inaczej osierocone standings
    // dalej wyświetlają się publicznie, a z panelu nie da się ich usunąć.
    const tables = await ctx.db
      .query("standings")
      .withIndex("by_source", (q) => q.eq("sourceId", sourceId))
      .collect();
    for (const table of tables) await ctx.db.delete(table._id);
    await ctx.db.delete(sourceId);
  },
});

export const markResult = internalMutation({
  args: {
    sourceId: v.id("syncSources"),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { sourceId, error }) => {
    await ctx.db.patch(sourceId, {
      lastSyncedAt: Date.now(),
      lastError: error,
    });
  },
});
