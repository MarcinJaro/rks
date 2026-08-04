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
// a wynik dopisuje dopiero po rozegraniu. Dlatego w kluczu siedzą liga,
// kolejka i znormalizowane nazwy drużyn — inaczej mecz z wynikiem trafiłby
// do bazy jako druga kopia terminu.
// Kolejka jest częścią klucza, bo w systemach 3- i 4-rundowych ta sama para
// gra u tego samego gospodarza dwa razy w sezonie. Gdy 90minut nie poda
// numeru kolejki, zostaje klucz bez niej — zgadywanie zastępnika rozjechałoby
// mecz z jego wcześniejszą kopią.
export function buildMatchId(
  leagueId: string,
  home: string,
  away: string,
  round?: number,
) {
  const teams = `${normalizeTeamName(home)}-${normalizeTeamName(away)}`;
  return round === undefined
    ? `90minut:${leagueId}:${teams}`
    : `90minut:${leagueId}:${round}:${teams}`;
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
      // synchronizacji pozostałych drużyn. Dotyczy to tak samo błędów
      // zgłaszanych przez sam sync (np. terminarz nie do odczytania).
      try {
        const outcome =
          source.kind === "ninetyminut"
            ? await syncNinetyMinut(ctx, source)
            : await syncVirium(ctx, source);
        result.upserted = outcome.upserted;
        result.error = outcome.error;
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

type SourceOutcome = { upserted: number; error?: string };

// Wiersz nagłówka kolumn nigdy się nie parsuje, a 90minut wtrąca czasem
// wiersz rozdzielający strefy tabeli — przy 16 drużynach to około 6%
// wierszy. Dopiero utrata co piątego wiersza oznacza zmianę szablonu,
// więc podmieniamy tabelę tylko wtedy, gdy sparsowaliśmy co najmniej 80%
// tego, co zobaczyliśmy.
const MIN_TABLE_PARSE_RATIO = 0.8;

// Tabela jest podmieniana tylko przy poprawnym parsie. Okrojona tabela
// (zmieniony szablon części wierszy) albo tabela bez naszej drużyny
// wygląda jak dane, a nie jak awaria — dlatego trzeba ją wyłapać tutaj.
function tableProblem(
  page: NinetyMinutPage,
  source: Doc<"syncSources">,
  ourName: string,
) {
  if (page.table.length < page.tableRowsSeen * MIN_TABLE_PARSE_RATIO) {
    return `Tabela ligowa: odczytano ${page.table.length} z ${page.tableRowsSeen} wierszy. Zostawiam poprzednią tabelę.`;
  }

  if (!page.table.some((row) => normalizeTeamName(row.name) === ourName)) {
    return `W tabeli ligowej nie ma drużyny «${source.teamNameOnSource}». Zostawiam poprzednią tabelę.`;
  }

  return null;
}

// Zerowy odczyt terminarza to najgroźniejsza cicha awaria: cron mieli
// co sześć godzin, panel pokazuje sukces, a do bazy nie trafia nic.
// Dlatego brak własnych meczów przy niepustej stronie jest błędem źródła.
function matchesProblem(
  page: NinetyMinutPage,
  source: Doc<"syncSources">,
  ourMatchCount: number,
) {
  if (ourMatchCount > 0) return null;

  if (page.matches.length > 0) {
    return `Żaden z ${page.matches.length} meczów na stronie źródła nie dotyczy drużyny «${source.teamNameOnSource}». Sprawdź nazwę drużyny u źródła.`;
  }

  if (page.table.length > 0) {
    return "Nie znaleziono terminarza na stronie źródła.";
  }

  return null;
}

async function syncNinetyMinut(
  ctx: ActionCtx,
  source: Doc<"syncSources">,
): Promise<SourceOutcome> {
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
        match.round,
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
  const problem = page.table.length > 0 ? tableProblem(page, source, ourName) : null;

  if (page.table.length > 0 && !problem) {
    await ctx.runMutation(internal.standings.replace, {
      teamId: source.teamId,
      sourceId: source._id,
      competitionName: page.competitionName,
      season: page.season,
      sourceUrl: source.url,
      rows: page.table.map((row) => ({
        ...row,
        isRks: normalizeTeamName(row.name) === ourName,
      })),
    });
  }

  // Błąd zgłaszamy dopiero po zapisie tego, co udało się odczytać — żeby
  // literówka w nazwie drużyny nie kasowała poprawnej tabeli, a awaria
  // jednego źródła nie zatrzymywała pozostałych.
  const problems = [matchesProblem(page, source, ours.length), problem].filter(
    (entry): entry is string => entry !== null,
  );

  return {
    upserted: ours.length,
    error: problems.length > 0 ? problems.join(" ") : undefined,
  };
}

async function syncVirium(
  ctx: ActionCtx,
  source: Doc<"syncSources">,
): Promise<SourceOutcome> {
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

  return { upserted: page.matches.length };
}
