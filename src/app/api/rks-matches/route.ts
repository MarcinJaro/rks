import { NextResponse } from "next/server";
import {
  getFetchableMatchSources,
  matchCenterTeams,
  type MatchSourceConfig,
  type MatchType,
} from "@/data/matchSources";

type MatchItem = {
  sourceMatchId: string;
  teamSlug: string;
  teamName?: string;
  sourceLabel?: string;
  homeTeam: string;
  awayTeam: string;
  date: number;
  result?: string;
  matchType: MatchType;
  status: "upcoming" | "live" | "finished";
};

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teamSlug = searchParams.get("team") || undefined;
  const matches = await fetchPublicMatches(teamSlug);
  const now = Date.now();
  const upcoming = matches
    .filter((match) => match.status === "upcoming" && match.date >= now)
    .sort((a, b) => a.date - b.date);
  const latestResults = matches
    .filter((match) => match.status === "finished")
    .sort((a, b) => b.date - a.date);

  return NextResponse.json(
    {
      nextMatch: upcoming[0] || null,
      upcoming: upcoming.slice(0, 8),
      latestResults: latestResults.slice(0, 8),
      teams: matchCenterTeams,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=1800",
      },
    },
  );
}

async function fetchPublicMatches(teamSlug?: string) {
  const sources = getPublicSourceConfig(teamSlug);
  const settled = await Promise.allSettled(
    sources.map(async (source) => {
      if (!source.url) return [];

      const response = await fetch(source.url, {
        headers: { Accept: "text/html" },
        next: { revalidate: 300 },
      });

      if (!response.ok) return [];

      const html = await response.text();
      if (source.type === "regionalnyfutbol") {
        return extractRegionalnyFutbolMatches(html, source);
      }
      if (source.type === "virium") return extractViriumMatches(html, source);
      if (source.type === "futbolowo") return extractFutbolowoMatches(html, source);

      return [];
    }),
  );

  return dedupeMatches(
    settled.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    ),
  );
}

function getPublicSourceConfig(teamSlug?: string) {
  const configuredSources = getFetchableMatchSources(teamSlug);
  const envFutbolowoSources = parseFutbolowoSources(
    process.env.FUTBOLOWO_SCHEDULE_URLS,
  ).filter((source) => !teamSlug || source.teamSlug === teamSlug);

  return [...configuredSources, ...envFutbolowoSources];
}

function parseFutbolowoSources(rawValue: string | undefined): MatchSourceConfig[] {
  if (!rawValue?.trim()) return [];

  return rawValue
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [url, teamSlug = "seniorzy", rawType] = entry
        .split("|")
        .map((part) => part.trim());
      return {
        type: "futbolowo" as const,
        teamSlug,
        label: "Futbolowo",
        url,
        matchType: parseMatchType(rawType),
        fetchable: true,
      };
    })
    .filter((entry) => entry.url);
}

function withSource(match: Omit<MatchItem, "teamSlug" | "sourceLabel">, source: MatchSourceConfig): MatchItem {
  return {
    ...match,
    teamSlug: source.teamSlug,
    teamName: matchCenterTeams.find((team) => team.slug === source.teamSlug)?.label,
    sourceLabel: source.label,
  };
}

function extractRegionalnyFutbolMatches(html: string, source: MatchSourceConfig) {
  const rows = html.match(
    /<tr><td[^>]*class="nr"[^>]*>[\s\S]*?<\/tr>/g,
  );

  if (!rows) return [];

  return rows
    .map((row) => normalizeRegionalnyFutbolRow(row, source))
    .filter((match): match is MatchItem => Boolean(match));
}

function normalizeRegionalnyFutbolRow(
  row: string,
  source: MatchSourceConfig,
): MatchItem | null {
  const sourceMatchId = row.match(/href="mecz,([^"]+)"/)?.[1];
  const homeTeam = cleanText(pickRegionalCell(row, "homeTeam"));
  const awayTeam = cleanText(pickRegionalCell(row, "awayTeam"));
  const rawResult = cleanText(pickRegionalCell(row, "result"));
  const result = normalizeDashScore(rawResult);
  const date = parseRegionalDate(pickRegionalCell(row, "date"));

  if (!sourceMatchId || !homeTeam || !awayTeam || !date) return null;

  return withSource({
    sourceMatchId: `regionalnyfutbol:${sourceMatchId}`,
    homeTeam,
    awayTeam,
    date,
    result,
    matchType: source.matchType,
    status: result ? "finished" : date > Date.now() ? "upcoming" : "finished",
  }, source);
}

function pickRegionalCell(row: string, className: string) {
  const match = row.match(
    new RegExp(`<td[^>]*class="${className}"[^>]*>([\\s\\S]*?)<\\/td>`),
  );
  return match?.[1] || "";
}

function extractViriumMatches(html: string, source: MatchSourceConfig) {
  const data = extractNextData(html);
  const props = getRecord(data, "props");
  const pageProps = getRecord(props, "pageProps");
  const team = getRecord(pageProps, "team");
  const schedule = team.schedule;
  if (!Array.isArray(schedule)) return [];

  return schedule
    .map((match) => normalizeViriumMatch(match, source))
    .filter((match): match is MatchItem => Boolean(match));
}

function normalizeViriumMatch(match: unknown, source: MatchSourceConfig) {
  if (!isRecord(match)) return null;

  const team1 = isRecord(match.team1) ? match.team1 : {};
  const team2 = isRecord(match.team2) ? match.team2 : {};
  const date = typeof match.date === "string" ? new Date(match.date).getTime() : NaN;
  const sourceMatchId = typeof match.id === "string" ? match.id : undefined;
  const homeTeam = typeof team1.name === "string" ? team1.name : undefined;
  const awayTeam = typeof team2.name === "string" ? team2.name : undefined;
  const fullTimeScore = isRecord(match.result)
    ? isRecord(match.result.fullTimeScore)
      ? match.result.fullTimeScore
      : {}
    : {};
  const homeScore = typeof fullTimeScore.team1 === "number" ? fullTimeScore.team1 : undefined;
  const awayScore = typeof fullTimeScore.team2 === "number" ? fullTimeScore.team2 : undefined;
  const result =
    homeScore !== undefined && awayScore !== undefined
      ? `${homeScore}:${awayScore}`
      : undefined;

  if (!sourceMatchId || !homeTeam || !awayTeam || !Number.isFinite(date)) {
    return null;
  }

  return withSource({
    sourceMatchId: `virium:${sourceMatchId}`,
    homeTeam,
    awayTeam,
    date,
    result,
    matchType: source.matchType,
    status: result ? "finished" : date > Date.now() ? "upcoming" : "finished",
  }, source);
}

function extractNextData(html: string): Record<string, unknown> | null {
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!match) return null;

  try {
    return JSON.parse(htmlDecode(match[1]));
  } catch {
    return null;
  }
}

function extractFutbolowoMatches(html: string, source: MatchSourceConfig) {
  const rows = html.match(
    /<tr[^>]*class="[^"]*\bgameRow\b[^"]*"[^>]*>[\s\S]*?<\/tr>/g,
  );

  if (!rows) return [];

  return rows
    .map((row) => normalizeFutbolowoRow(row, source))
    .filter((match): match is MatchItem => Boolean(match))
    .filter((match) =>
      [match.homeTeam, match.awayTeam].some((team) =>
        normalizeTeamName(team).includes("okecie"),
      ),
    );
}

function normalizeFutbolowoRow(
  row: string,
  source: MatchSourceConfig,
): MatchItem | null {
  const sourceMatchId = pickAttribute(row, "data-id") || pickGameId(row);
  const rawDate = pickAttribute(row, "datetime");
  const [homeTeam, awayTeam] = pickClubNames(row);

  if (!sourceMatchId || !rawDate || !homeTeam || !awayTeam) return null;

  const date = new Date(rawDate).getTime();
  if (!Number.isFinite(date)) return null;

  const result = normalizeScore(pickCell(row, "gameScore"));

  return withSource({
    sourceMatchId: `futbolowo:${sourceMatchId}`,
    homeTeam,
    awayTeam,
    date,
    result,
    matchType: source.matchType,
    status: result ? "finished" : date > Date.now() ? "upcoming" : "finished",
  }, source);
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

function pickAttribute(html: string, attribute: string) {
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

function normalizeDashScore(value: string) {
  const score = cleanText(value).match(/\d+\s*-\s*\d+/)?.[0];
  return score?.replace(/\s+/g, "").replace("-", ":");
}

function parseRegionalDate(value: string) {
  const text = cleanText(value);
  const monthNames: Record<string, string> = {
    stycznia: "01",
    lutego: "02",
    marca: "03",
    kwietnia: "04",
    maja: "05",
    czerwca: "06",
    lipca: "07",
    sierpnia: "08",
    września: "09",
    pazdziernika: "10",
    października: "10",
    listopada: "11",
    grudnia: "12",
  };
  const match = text.match(
    /(\d{1,2})(?:\/\d{1,2})?\.?\s+([A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ]+)\s+(\d{4})(?:\s*-\s*(\d{1,2}:\d{2}))?/,
  );

  if (!match) return null;

  const [, day, monthName, year, time = "12:00"] = match;
  const month = monthNames[monthName.toLowerCase()];
  if (!month) return null;

  const timestamp = new Date(
    `${year}-${month}-${day.padStart(2, "0")}T${time}:00+02:00`,
  ).getTime();

  return Number.isFinite(timestamp) ? timestamp : null;
}

function parseMatchType(value?: string): MatchItem["matchType"] {
  if (value === "sparing" || value === "turniej" || value === "puchar") {
    return value;
  }

  return "liga";
}

function dedupeMatches(matches: MatchItem[]) {
  const seen = new Set<string>();

  return matches.filter((match) => {
    if (seen.has(match.sourceMatchId)) return false;
    seen.add(match.sourceMatchId);
    return true;
  });
}

function normalizeTeamName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l");
}

function cleanText(value = "") {
  return htmlDecode(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
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

function getRecord(source: Record<string, unknown> | null, key: string) {
  const value = source?.[key];
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
