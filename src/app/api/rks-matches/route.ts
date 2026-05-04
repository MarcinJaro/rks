import { NextResponse } from "next/server";

type MatchItem = {
  sourceMatchId: string;
  homeTeam: string;
  awayTeam: string;
  date: number;
  result?: string;
  matchType: "liga" | "sparing" | "turniej" | "puchar";
  status: "upcoming" | "live" | "finished";
};

type ScheduleConfig = {
  url: string;
  matchType: MatchItem["matchType"];
};

const DEFAULT_SCHEDULES: ScheduleConfig[] = [
  {
    url: "https://rksokecie.futbolowo.pl/schedule/3637/27558/4458",
    matchType: "puchar",
  },
  {
    url: "https://rksokecie.futbolowo.pl/schedule/20464/27558/4458",
    matchType: "liga",
  },
];

export const dynamic = "force-dynamic";

export async function GET() {
  const matches = await fetchPublicMatches();
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
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=1800",
      },
    },
  );
}

async function fetchPublicMatches() {
  const schedules = getScheduleConfig();
  const settled = await Promise.allSettled(
    schedules.map(async (schedule) => {
      const response = await fetch(schedule.url, {
        headers: { Accept: "text/html" },
        next: { revalidate: 300 },
      });

      if (!response.ok) return [];

      return extractMatches(await response.text(), schedule);
    }),
  );

  return dedupeMatches(
    settled.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    ),
  );
}

function getScheduleConfig() {
  const rawValue = process.env.FUTBOLOWO_SCHEDULE_URLS;

  if (!rawValue?.trim()) return DEFAULT_SCHEDULES;

  return rawValue
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [url, , rawType] = entry.split("|").map((part) => part.trim());
      return {
        url,
        matchType: parseMatchType(rawType),
      };
    })
    .filter((entry) => entry.url);
}

function extractMatches(html: string, schedule: ScheduleConfig) {
  const rows = html.match(
    /<tr[^>]*class="[^"]*\bgameRow\b[^"]*"[^>]*>[\s\S]*?<\/tr>/g,
  );

  if (!rows) return [];

  return rows
    .map((row) => normalizeRow(row, schedule))
    .filter((match): match is MatchItem => Boolean(match))
    .filter((match) =>
      [match.homeTeam, match.awayTeam].some((team) =>
        normalizeTeamName(team).includes("okecie"),
      ),
    );
}

function normalizeRow(row: string, schedule: ScheduleConfig): MatchItem | null {
  const sourceMatchId = pickAttribute(row, "data-id") || pickGameId(row);
  const rawDate = pickAttribute(row, "datetime");
  const [homeTeam, awayTeam] = pickClubNames(row);

  if (!sourceMatchId || !rawDate || !homeTeam || !awayTeam) return null;

  const date = new Date(rawDate).getTime();
  if (!Number.isFinite(date)) return null;

  const result = normalizeScore(pickCell(row, "gameScore"));

  return {
    sourceMatchId: `futbolowo:${sourceMatchId}`,
    homeTeam,
    awayTeam,
    date,
    result,
    matchType: schedule.matchType,
    status: result ? "finished" : date > Date.now() ? "upcoming" : "finished",
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
