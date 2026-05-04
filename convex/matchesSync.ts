import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

type LnpMatch = Record<string, unknown>;

type NormalizedMatch = {
  sourceMatchId: string;
  homeTeam: string;
  awayTeam: string;
  date: number;
  venue?: string;
  result?: string;
  matchType: "liga" | "sparing" | "turniej" | "puchar";
  status: "upcoming" | "live" | "finished";
};

type FutbolowoScheduleConfig = {
  url: string;
  teamSlug?: string;
  matchType?: NormalizedMatch["matchType"];
};

const DEFAULT_LNP_API_BASE =
  "https://competition-api-pro.laczynaspilka.pl/api/bus/competition/v1/";

const DEFAULT_FUTBOLOWO_SCHEDULES: FutbolowoScheduleConfig[] = [
  {
    url: "https://rksokecie.futbolowo.pl/schedule/3637/27558/4458",
    teamSlug: "seniorzy",
    matchType: "puchar",
  },
];

export const syncFromLnp = internalAction({
  handler: async (ctx) => {
    const bearerToken = process.env.LNP_BEARER_TOKEN;
    const playId = process.env.LNP_PLAY_ID;
    const teamId = process.env.LNP_TEAM_ID;
    const apiBase = process.env.LNP_COMPETITION_API_BASE || DEFAULT_LNP_API_BASE;

    if (!bearerToken || !playId) {
      return {
        success: false,
        error: "Missing LNP_BEARER_TOKEN or LNP_PLAY_ID in Convex env vars.",
      };
    }

    const endpoints = teamId
      ? [
          `teams/${teamId}/plays/${playId}/played-matches`,
          `teams/${teamId}/plays/${playId}/not-played-matches`,
        ]
      : [`plays/${playId}/matches`];

    let upserted = 0;
    let skipped = 0;

    for (const endpoint of endpoints) {
      const response = await fetch(new URL(endpoint, apiBase), {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${bearerToken}`,
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `LNP API returned ${response.status} for ${endpoint}.`,
        };
      }

      const payload = await response.json();
      const matches = extractMatches(payload);

      for (const rawMatch of matches) {
        const match = normalizeMatch(rawMatch);
        if (!match) {
          skipped++;
          continue;
        }

        await ctx.runMutation(internal.matches.upsertFromLnp, match);
        upserted++;
      }
    }

    return { success: true, upserted, skipped };
  },
});

export const triggerLnpSync = action({
  handler: async (ctx) => {
    return await ctx.runAction(internal.matchesSync.syncFromLnp);
  },
});

export const syncFromFutbolowo = internalAction({
  handler: async (ctx) => {
    const schedules = parseFutbolowoSchedules(
      process.env.FUTBOLOWO_SCHEDULE_URLS,
    );

    let upserted = 0;
    let skipped = 0;

    for (const schedule of schedules) {
      const response = await fetch(schedule.url, {
        headers: { Accept: "text/html" },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Futbolowo returned ${response.status} for ${schedule.url}.`,
        };
      }

      const html = await response.text();
      const matches = extractFutbolowoMatches(html, schedule);

      for (const match of matches) {
        if (!containsRksTeam(match)) {
          skipped++;
          continue;
        }

        await ctx.runMutation(internal.matches.upsertFromSource, {
          ...match,
          source: "futbolowo",
          teamSlug: schedule.teamSlug,
        });
        upserted++;
      }
    }

    return { success: true, upserted, skipped };
  },
});

export const triggerFutbolowoSync = action({
  handler: async (ctx) => {
    return await ctx.runAction(internal.matchesSync.syncFromFutbolowo);
  },
});

export const syncConfiguredSources = internalAction({
  handler: async (ctx) => {
    const results: Record<string, unknown> = {};

    if (process.env.LNP_BEARER_TOKEN && process.env.LNP_PLAY_ID) {
      results.lnp = await ctx.runAction(internal.matchesSync.syncFromLnp);
    }

    results.futbolowo = await ctx.runAction(
      internal.matchesSync.syncFromFutbolowo,
    );

    return results;
  },
});

export const triggerConfiguredSync = action({
  handler: async (ctx) => {
    return await ctx.runAction(internal.matchesSync.syncConfiguredSources);
  },
});

function extractMatches(payload: unknown): LnpMatch[] {
  if (Array.isArray(payload)) return payload.filter(isRecord);
  if (!isRecord(payload)) return [];

  for (const key of ["matches", "items", "data", "results"]) {
    const value = payload[key];
    if (Array.isArray(value)) return value.filter(isRecord);
  }

  return [];
}

function normalizeMatch(match: LnpMatch): NormalizedMatch | null {
  const sourceMatchId =
    pickString(match, ["id", "matchId", "uuid"]) ||
    pickString(record(match.match), ["id", "matchId", "uuid"]);
  const homeTeam =
    pickNestedName(match, ["homeTeam", "host", "teamHome"]) ||
    pickString(match, ["homeTeamName", "hostName"]);
  const awayTeam =
    pickNestedName(match, ["awayTeam", "guest", "teamAway"]) ||
    pickString(match, ["awayTeamName", "guestName"]);
  const rawDate =
    pickString(match, ["date", "matchDate", "startDate", "plannedDate"]) ||
    pickString(record(match.match), ["date", "matchDate", "startDate"]);

  if (!sourceMatchId || !homeTeam || !awayTeam || !rawDate) return null;

  const timestamp = new Date(rawDate).getTime();
  if (!Number.isFinite(timestamp)) return null;

  const result =
    pickString(match, ["result", "resultText", "score"]) || buildScore(match);
  const status = pickStatus(match, timestamp, result);

  return {
    sourceMatchId,
    homeTeam,
    awayTeam,
    date: timestamp,
    venue: pickNestedName(match, ["venue", "stadium", "place"]),
    result,
    matchType: "liga",
    status,
  };
}

function parseFutbolowoSchedules(
  rawValue: string | undefined,
): FutbolowoScheduleConfig[] {
  if (!rawValue?.trim()) return DEFAULT_FUTBOLOWO_SCHEDULES;

  return rawValue
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [url, teamSlug, rawType] = entry.split("|").map((part) => part.trim());
      return {
        url,
        teamSlug: teamSlug || undefined,
        matchType: parseMatchType(rawType),
      };
    })
    .filter((entry) => entry.url);
}

function extractFutbolowoMatches(
  html: string,
  schedule: FutbolowoScheduleConfig,
): NormalizedMatch[] {
  const rows = html.match(
    /<tr[^>]*class="[^"]*\bgameRow\b[^"]*"[^>]*>[\s\S]*?<\/tr>/g,
  );

  if (!rows) return [];

  return rows
    .map((row) => normalizeFutbolowoRow(row, schedule))
    .filter((match): match is NormalizedMatch => Boolean(match));
}

function normalizeFutbolowoRow(
  row: string,
  schedule: FutbolowoScheduleConfig,
): NormalizedMatch | null {
  const sourceMatchId = pickHtmlAttribute(row, "data-id") || pickGameId(row);
  const rawDate = pickHtmlAttribute(row, "datetime");
  const [homeTeam, awayTeam] = pickClubNames(row);

  if (!sourceMatchId || !rawDate || !homeTeam || !awayTeam) return null;

  const timestamp = new Date(rawDate).getTime();
  if (!Number.isFinite(timestamp)) return null;

  const result = normalizeScore(stripTags(pickCell(row, "gameScore")));

  return {
    sourceMatchId: `futbolowo:${sourceMatchId}`,
    homeTeam,
    awayTeam,
    date: timestamp,
    result,
    matchType: schedule.matchType || inferMatchType(htmlDecode(row)),
    status: pickFutbolowoStatus(timestamp, result),
  };
}

function pickClubNames(row: string) {
  const names = [...row.matchAll(/<div class="club-name">([\s\S]*?)<\/div>/g)]
    .map((match) => cleanText(match[1]))
    .filter(Boolean);

  return [names[0], names[1]];
}

function pickCell(row: string, className: string) {
  const match = row.match(
    new RegExp(`<td[^>]*class="${className}"[^>]*>([\\s\\S]*?)<\\/td>`),
  );
  return match?.[1] || "";
}

function pickHtmlAttribute(html: string, attribute: string) {
  const match = html.match(new RegExp(`${attribute}="([^"]+)"`));
  return match?.[1];
}

function pickGameId(row: string) {
  const match = row.match(/id="game_(\d+)"/);
  return match?.[1];
}

function normalizeScore(value: string) {
  const score = cleanText(value).match(/\d+\s*:\s*\d+/)?.[0];
  return score?.replace(/\s+/g, "");
}

function pickFutbolowoStatus(timestamp: number, result?: string) {
  if (result) return "finished";
  return timestamp > Date.now() ? "upcoming" : "finished";
}

function parseMatchType(value?: string): NormalizedMatch["matchType"] {
  if (value === "sparing" || value === "turniej" || value === "puchar") {
    return value;
  }

  return "liga";
}

function inferMatchType(value: string): NormalizedMatch["matchType"] {
  const normalized = value.toLowerCase();
  if (normalized.includes("puchar")) return "puchar";
  if (normalized.includes("sparing") || normalized.includes("towarzysk")) {
    return "sparing";
  }
  if (normalized.includes("turniej")) return "turniej";
  return "liga";
}

function containsRksTeam(match: NormalizedMatch) {
  return [match.homeTeam, match.awayTeam].some((team) =>
    normalizeTeamName(team).includes("okecie"),
  );
}

function normalizeTeamName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l");
}

function stripTags(value = "") {
  return value.replace(/<[^>]+>/g, " ");
}

function cleanText(value = "") {
  return htmlDecode(stripTags(value)).replace(/\s+/g, " ").trim();
}

function htmlDecode(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function pickStatus(
  match: LnpMatch,
  timestamp: number,
  result?: string,
): NormalizedMatch["status"] {
  const status = pickString(match, ["status", "matchStatus"]);
  const normalized = status?.toLowerCase();

  if (normalized?.includes("live")) return "live";
  if (result || normalized?.includes("played") || normalized?.includes("finished")) {
    return "finished";
  }

  return timestamp > Date.now() ? "upcoming" : "finished";
}

function buildScore(match: LnpMatch) {
  const homeGoals = pickNumber(match, ["homeGoals", "hostGoals", "homeScore"]);
  const awayGoals = pickNumber(match, ["awayGoals", "guestGoals", "awayScore"]);

  if (homeGoals === undefined || awayGoals === undefined) return undefined;
  return `${homeGoals}:${awayGoals}`;
}

function pickNestedName(source: LnpMatch, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value;
    const nested = record(value);
    const name = pickString(nested, ["name", "fullName", "clubName"]);
    if (name) return name;
  }

  return undefined;
}

function pickString(source: LnpMatch, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }

  return undefined;
}

function pickNumber(source: LnpMatch, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }

  return undefined;
}

function record(value: unknown): LnpMatch {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is LnpMatch {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
