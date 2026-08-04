import { htmlDecode } from "./encoding";

export type ViriumMatch = {
  sourceMatchId: string;
  homeTeam: string;
  awayTeam: string;
  date: number;
  result?: string;
};

export function parseViriumTeamIdFromUrl(url: string) {
  return url.match(/virium\.pl\/[^/]+\/teams\/([0-9a-f-]{36})/i)?.[1] ?? null;
}

export function parseViriumPage(
  html: string,
): { matches: ViriumMatch[] } | null {
  const raw = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!raw) return null;

  let data: unknown;
  try {
    data = JSON.parse(htmlDecode(raw[1]));
  } catch {
    return null;
  }

  const team = getRecord(
    getRecord(getRecord(data, "props"), "pageProps"),
    "team",
  );
  const schedule = team.schedule;
  if (!Array.isArray(schedule)) return { matches: [] };

  return {
    matches: schedule
      .map(normalizeViriumMatch)
      .filter((match): match is ViriumMatch => Boolean(match)),
  };
}

function normalizeViriumMatch(entry: unknown): ViriumMatch | null {
  if (!isRecord(entry)) return null;

  const team1 = isRecord(entry.team1) ? entry.team1 : {};
  const team2 = isRecord(entry.team2) ? entry.team2 : {};
  const homeTeam = typeof team1.name === "string" ? team1.name : undefined;
  const awayTeam = typeof team2.name === "string" ? team2.name : undefined;
  const sourceMatchId = typeof entry.id === "string" ? entry.id : undefined;
  const date =
    typeof entry.date === "string" ? new Date(entry.date).getTime() : NaN;

  if (!homeTeam || !awayTeam || !sourceMatchId || !Number.isFinite(date)) {
    return null;
  }

  const score =
    isRecord(entry.result) && isRecord(entry.result.fullTimeScore)
      ? entry.result.fullTimeScore
      : {};
  const home = typeof score.team1 === "number" ? score.team1 : undefined;
  const away = typeof score.team2 === "number" ? score.team2 : undefined;

  return {
    sourceMatchId,
    homeTeam,
    awayTeam,
    date,
    result:
      home !== undefined && away !== undefined ? `${home}:${away}` : undefined,
  };
}

function getRecord(value: unknown, key: string): Record<string, unknown> {
  const record = isRecord(value) ? value[key] : undefined;
  return isRecord(record) ? record : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
