import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import type { PaginationResult } from "convex/server";
import { v } from "convex/values";

import { requireAdmin } from "./adminAuth";
import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

type RelationFields = {
  teamId?: Id<"teams">;
  matchId?: Id<"matches">;
  coachId?: Id<"people">;
  articleId?: Id<"articles">;
  sourceId?: Id<"syncSources">;
};

type AdminRelations = Record<string, string>;

type EnrichedAdminRow<T extends object> = T & {
  __adminRelations?: AdminRelations;
};

async function addAdminRelations<T extends object>(
  ctx: QueryCtx,
  result: PaginationResult<T>,
): Promise<PaginationResult<EnrichedAdminRow<T>>> {
  const teamIds = new Set<Id<"teams">>();
  const matchIds = new Set<Id<"matches">>();
  const coachIds = new Set<Id<"people">>();
  const articleIds = new Set<Id<"articles">>();
  const sourceIds = new Set<Id<"syncSources">>();

  for (const row of result.page) {
    const relations = row as T & RelationFields;
    if (relations.teamId) teamIds.add(relations.teamId);
    if (relations.matchId) matchIds.add(relations.matchId);
    if (relations.coachId) coachIds.add(relations.coachId);
    if (relations.articleId) articleIds.add(relations.articleId);
    if (relations.sourceId) sourceIds.add(relations.sourceId);
  }

  const [teams, matches, coaches, articles, sources] = await Promise.all([
    Promise.all([...teamIds].map((id) => ctx.db.get("teams", id))),
    Promise.all([...matchIds].map((id) => ctx.db.get("matches", id))),
    Promise.all([...coachIds].map((id) => ctx.db.get("people", id))),
    Promise.all([...articleIds].map((id) => ctx.db.get("articles", id))),
    Promise.all([...sourceIds].map((id) => ctx.db.get("syncSources", id))),
  ]);

  const teamLabels = new Map<string, string>();
  for (const team of teams) {
    if (team) teamLabels.set(team._id, team.name);
  }

  const matchLabels = new Map<string, string>();
  for (const match of matches) {
    if (match) {
      matchLabels.set(match._id, `${match.homeTeam} vs ${match.awayTeam}`);
    }
  }

  const coachLabels = new Map<string, string>();
  for (const coach of coaches) {
    if (coach) coachLabels.set(coach._id, coach.name);
  }

  const articleLabels = new Map<string, string>();
  for (const article of articles) {
    if (article) articleLabels.set(article._id, article.title);
  }

  const sourceLabels = new Map<string, string>();
  for (const source of sources) {
    if (!source) continue;
    const provider = source.kind === "ninetyminut" ? "90minut.pl" : "Virium";
    sourceLabels.set(source._id, `${source.teamNameOnSource} · ${provider}`);
  }

  return {
    ...result,
    page: result.page.map((row): EnrichedAdminRow<T> => {
      const relationFields = row as T & RelationFields;
      const relations: AdminRelations = {};

      if (relationFields.teamId) {
        const label = teamLabels.get(relationFields.teamId);
        if (label) relations.teamId = label;
      }
      if (relationFields.matchId) {
        const label = matchLabels.get(relationFields.matchId);
        if (label) relations.matchId = label;
      }
      if (relationFields.coachId) {
        const label = coachLabels.get(relationFields.coachId);
        if (label) relations.coachId = label;
      }
      if (relationFields.articleId) {
        const label = articleLabels.get(relationFields.articleId);
        if (label) relations.articleId = label;
      }
      if (relationFields.sourceId) {
        const label = sourceLabels.get(relationFields.sourceId);
        if (label) relations.sourceId = label;
      }

      return Object.keys(relations).length > 0
        ? { ...row, __adminRelations: relations }
        : row;
    }),
  };
}

export const adminTableName = v.union(
  v.literal("appSettings"),
  v.literal("articles"),
  v.literal("documents"),
  v.literal("fbPosts"),
  v.literal("galleries"),
  v.literal("liveStreams"),
  v.literal("matchEvents"),
  v.literal("matches"),
  v.literal("pages"),
  v.literal("people"),
  v.literal("players"),
  v.literal("regulationAcceptances"),
  v.literal("settings"),
  v.literal("sponsors"),
  v.literal("standings"),
  v.literal("storage"),
  v.literal("syncSources"),
  v.literal("teams"),
);

/**
 * Chronologiczny, tylko-do-odczytu widok wszystkich tabel aplikacji.
 * Dedykowane moduły nadal odpowiadają za zapis, a Centrum danych gwarantuje,
 * że żadna tabela Convex nie pozostaje niewidoczna dla administratora.
 */
export const listTable = query({
  args: {
    table: adminTableName,
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(v.any()),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    if (args.table === "storage") {
      const result = await ctx.db.system
        .query("_storage")
        .order("desc")
        .paginate(args.paginationOpts);
      return await addAdminRelations(ctx, {
        ...result,
        page: await Promise.all(
          result.page.map(async (file) => ({
            ...file,
            url: await ctx.storage.getUrl(file._id),
          })),
        ),
      });
    }

    const result = await ctx.db
      .query(args.table)
      .order("desc")
      .paginate(args.paginationOpts);
    return await addAdminRelations(ctx, result);
  },
});
