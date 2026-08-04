import { cleanText } from "./encoding";
import { polishDateToUtc } from "./polishTime";

export type NinetyMinutRow = {
  position: number;
  name: string;
  played: number;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
};

export type NinetyMinutMatch = {
  homeTeam: string;
  awayTeam: string;
  date: number;
  result?: string;
  note?: string;
  matchUrl?: string;
  walkover?: boolean;
};

export type NinetyMinutPage = {
  competitionName: string;
  season: string;
  table: NinetyMinutRow[];
  matches: NinetyMinutMatch[];
};

const MONTHS: Record<string, number> = {
  stycznia: 1,
  lutego: 2,
  marca: 3,
  kwietnia: 4,
  maja: 5,
  czerwca: 6,
  lipca: 7,
  sierpnia: 8,
  września: 9,
  wrzesnia: 9,
  października: 10,
  pazdziernika: 10,
  listopada: 11,
  grudnia: 12,
};

export function parseLeagueIdFromUrl(url: string) {
  return url.match(/90minut\.pl\/liga\/\d+\/liga(\d+)\.html/i)?.[1] ?? null;
}

export function normalizeTeamName(value: string) {
  return cleanText(value)
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function parseNinetyMinutPage(html: string): NinetyMinutPage | null {
  const competitionName = parseCompetitionName(html);
  if (!competitionName) return null;

  const season = competitionName.match(/(\d{4})\/(\d{4})/);
  if (!season) return null;

  const years: [number, number] = [Number(season[1]), Number(season[2])];

  return {
    competitionName,
    season: season[0],
    table: parseTable(html),
    matches: parseMatches(html, years),
  };
}

function parseCompetitionName(html: string) {
  const header = html.match(
    /<td colspan="14" class="main">[\s\S]*?<b>([\s\S]*?)<\/b>/,
  );
  return header ? cleanText(header[1]) : null;
}

function parseTable(html: string): NinetyMinutRow[] {
  const start = html.indexOf('class="main2"');
  if (start === -1) return [];

  const end = html.indexOf("</table>", start);
  const section = html.slice(start, end === -1 ? undefined : end);
  const rows = section.match(
    /<tr align="center" bgcolor="#[0-9A-Fa-f]{6}">[\s\S]*?<\/tr>/g,
  );
  if (!rows) return [];

  const parsed: NinetyMinutRow[] = [];
  // 90minut pokazuje numer pozycji tylko przy pierwszej drużynie
  // z grupy o równym dorobku — kolejne dziedziczą go po wierszu wyżej.
  let lastPosition = 0;

  for (const row of rows) {
    const parsedRow = parseTableRow(row, lastPosition);
    if (!parsedRow) continue;
    lastPosition = parsedRow.position;
    parsed.push(parsedRow);
  }

  return parsed;
}

function parseTableRow(
  row: string,
  lastPosition: number,
): NinetyMinutRow | null {
  const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((cell) =>
    cleanText(cell[1]),
  );
  if (cells.length < 8) return null;

  const name = cells[1];
  if (!name) return null;

  const goals = cells[7].match(/(\d+)\s*-\s*(\d+)/);
  if (!goals) return null;

  const rawPosition = Number(cells[0].replace(".", ""));
  const position =
    cells[0] && Number.isFinite(rawPosition) ? rawPosition : lastPosition;
  if (!position) return null;

  return {
    position,
    name,
    played: Number(cells[2]) || 0,
    points: Number(cells[3]) || 0,
    wins: Number(cells[4]) || 0,
    draws: Number(cells[5]) || 0,
    losses: Number(cells[6]) || 0,
    goalsFor: Number(goals[1]),
    goalsAgainst: Number(goals[2]),
  };
}

function parseMatches(
  html: string,
  years: [number, number],
): NinetyMinutMatch[] {
  // Wiersze meczów i notatek mają align="left"; znacznik walkowera
  // siedzi w wierszu bez atrybutów, dlatego bierzemy oba warianty.
  const rows = html.match(/<tr(?: align="left")?>[\s\S]*?<\/tr>/g);
  if (!rows) return [];

  const matches: NinetyMinutMatch[] = [];
  // Notatki i walkower dotyczą meczu bezpośrednio nad nimi. Jeśli tamten
  // wiersz odpadł (np. bez terminu), nie ma do czego ich dopiąć.
  let annotated: NinetyMinutMatch | null = null;

  for (const row of rows) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)];

    if (cells.length === 1) {
      const text = cleanText(cells[0][1]);

      if (/^\(wo\)$/i.test(text)) {
        if (annotated) annotated.walkover = true;
        continue;
      }

      // Notatka: jedna komórka colspan=4 pod ostatnim meczem.
      if (/colspan="4"/.test(row) && annotated && text) {
        annotated.note = annotated.note ? `${annotated.note} / ${text}` : text;
      }
      continue;
    }

    if (cells.length < 4) continue;

    const homeTeam = cleanText(cells[0][1]);
    const awayTeam = cleanText(cells[2][1]);
    const date = parseMatchDate(cleanText(cells[3][1]), years);
    if (!homeTeam || !awayTeam || date === null) {
      annotated = null;
      continue;
    }

    const scoreCell = cells[1][1];
    const result = cleanText(scoreCell).match(/(\d+)\s*-\s*(\d+)/);
    const matchUrl = scoreCell.match(/href="([^"]+)"/)?.[1];

    const match: NinetyMinutMatch = {
      homeTeam,
      awayTeam,
      date,
      result: result ? `${result[1]}:${result[2]}` : undefined,
      matchUrl,
    };

    matches.push(match);
    annotated = match;
  }

  return matches;
}

function parseMatchDate(value: string, years: [number, number]) {
  const parsed = value.match(
    /(\d{1,2})\s+([A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ]+)(?:,\s*(\d{1,2}):(\d{2}))?/,
  );
  if (!parsed) return null;

  const month = MONTHS[parsed[2].toLowerCase()];
  if (!month) return null;

  const year = month >= 7 ? years[0] : years[1];
  return polishDateToUtc(
    year,
    month,
    Number(parsed[1]),
    parsed[3] ? Number(parsed[3]) : 12,
    parsed[4] ? Number(parsed[4]) : 0,
  );
}
