import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { requireAdmin } from "./adminAuth";
import { decodeIso88592 } from "./sources/encoding";
import {
  normalizeTeamName,
  parseNinetyMinutPage,
  type NinetyMinutPage,
} from "./sources/ninetyMinut";
import { parseViriumPage } from "./sources/virium";

export type SyncSourceResult = {
  sourceId: string;
  url: string;
  upserted: number;
  error?: string;
};

export type SyncAllResult = {
  skipped: boolean;
  results: SyncSourceResult[];
};

// Klucz meczu musi być stabilny przez cały sezon: 90minut nie daje id meczu,
// a wynik dopisuje dopiero po rozegraniu. Dlatego w kluczu siedzą wyłącznie
// liga i znormalizowane nazwy drużyn — inaczej mecz z wynikiem trafiłby
// do bazy jako druga kopia terminu.
export function buildMatchId(leagueId: string, home: string, away: string) {
  return `90minut:${leagueId}:${normalizeTeamName(home)}-${normalizeTeamName(away)}`;
}

export const syncAll = internalAction({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, { force }): Promise<SyncAllResult> => {
    if (!force) {
      const enabled = await ctx.runQuery(internal.appSettings.readAutoSync, {});
      if (!enabled) return { skipped: true, results: [] };
    }

    const sources = await ctx.runQuery(internal.syncSources.listEnabled, {});
    const results: SyncSourceResult[] = [];

    for (const source of sources) {
      const result: SyncSourceResult = {
        sourceId: source._id,
        url: source.url,
        upserted: 0,
      };

      // Izolacja per źródło: awaria jednego serwisu nie może zatrzymać
      // synchronizacji pozostałych drużyn.
      try {
        result.upserted =
          source.kind === "ninetyminut"
            ? await syncNinetyMinut(ctx, source)
            : await syncVirium(ctx, source);
      } catch (error) {
        result.error = error instanceof Error ? error.message : String(error);
      }

      await ctx.runMutation(internal.syncSources.markResult, {
        sourceId: source._id,
        error: result.error,
      });
      results.push(result);
    }

    return { skipped: false, results };
  },
});

export const triggerSync = action({
  args: {},
  handler: async (ctx): Promise<SyncAllResult> => {
    await requireAdmin(ctx);
    return await ctx.runAction(internal.matchesSync.syncAll, { force: true });
  },
});

// Mecz bez wyniku z terminem tylko orientacyjnym zostaje w terminarzu,
// nawet gdy zgadywana data już minęła — inaczej nierozegrane spotkanie
// wpadłoby między wyniki.
function matchStatus(date: number, result?: string, dateConfirmed = true) {
  if (result) return "finished" as const;
  if (!dateConfirmed) return "upcoming" as const;
  return date > Date.now() ? ("upcoming" as const) : ("finished" as const);
}

function buildRoundLabel(round?: number, dateLabel?: string) {
  if (!round) return undefined;
  return dateLabel ? `${round}. kolejka, ${dateLabel}` : `${round}. kolejka`;
}

async function syncNinetyMinut(ctx: ActionCtx, source: Doc<"syncSources">) {
  const response = await fetch(source.url, { headers: { Accept: "text/html" } });
  if (!response.ok) {
    throw new Error(`90minut zwrócił ${response.status}`);
  }

  const html = decodeIso88592(new Uint8Array(await response.arrayBuffer()));
  const page: NinetyMinutPage | null = parseNinetyMinutPage(html);
  if (!page) {
    throw new Error("Nie udało się odczytać strony ligi (zmieniony układ?)");
  }

  const ourName = normalizeTeamName(source.teamNameOnSource);
  const ours = page.matches.filter(
    (match) =>
      normalizeTeamName(match.homeTeam) === ourName ||
      normalizeTeamName(match.awayTeam) === ourName,
  );

  for (const match of ours) {
    await ctx.runMutation(internal.matches.upsertFromSource, {
      source: "ninetyminut",
      sourceMatchId: buildMatchId(
        source.externalId,
        match.homeTeam,
        match.awayTeam,
      ),
      sourceCompetitionId: source.externalId,
      sourceUrl: match.matchUrl ?? source.url,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      date: match.date,
      dateConfirmed: match.dateConfirmed,
      roundLabel: buildRoundLabel(match.round, match.roundDateLabel),
      venue: match.note,
      result: match.result,
      matchType: source.matchType,
      status: matchStatus(match.date, match.result, match.dateConfirmed),
      teamId: source.teamId,
    });
  }

  // `standings.replace` odrzuca pustą tabelę, żeby nie skasować dobrych danych.
  // Pusty wynik parsowania (świeża strona, zmieniony układ) nie jest błędem
  // syncu meczów, więc po prostu zostawiamy poprzednią tabelę.
  if (page.table.length > 0) {
    await ctx.runMutation(internal.standings.replace, {
      teamId: source.teamId,
      competitionName: page.competitionName,
      season: page.season,
      sourceUrl: source.url,
      rows: page.table.map((row) => ({
        ...row,
        isRks: normalizeTeamName(row.name) === ourName,
      })),
    });
  }

  return ours.length;
}

async function syncVirium(ctx: ActionCtx, source: Doc<"syncSources">) {
  const response = await fetch(source.url, { headers: { Accept: "text/html" } });
  if (!response.ok) {
    throw new Error(`virium zwrócił ${response.status}`);
  }

  const page = parseViriumPage(await response.text());
  if (!page) {
    throw new Error("Nie udało się odczytać danych drużyny (zmieniony układ?)");
  }

  for (const match of page.matches) {
    await ctx.runMutation(internal.matches.upsertFromSource, {
      source: "virium",
      sourceMatchId: `virium:${match.sourceMatchId}`,
      sourceTeamId: source.externalId,
      sourceUrl: source.url,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      date: match.date,
      result: match.result,
      matchType: source.matchType,
      status: matchStatus(match.date, match.result),
      teamId: source.teamId,
    });
  }

  return page.matches.length;
}
