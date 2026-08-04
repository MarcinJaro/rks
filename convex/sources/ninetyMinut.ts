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
  // false, gdy termin pochodzi z zakresu w nagłówku kolejki,
  // a nie z własnej daty meczu.
  dateConfirmed: boolean;
  round?: number;
  roundDateLabel?: string;
  result?: string;
  note?: string;
  matchUrl?: string;
  walkover?: boolean;
};

export type NinetyMinutPage = {
  competitionName: string;
  season: string;
  table: NinetyMinutRow[];
  // Ile wierszy wyglądających na wiersz tabeli parser w ogóle zobaczył.
  // Różnica względem `table.length` mówi, czy 90minut zmieniło szablon —
  // bez tego okrojona tabela wygląda jak poprawna.
  tableRowsSeen: number;
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
  const table = parseTable(html);

  return {
    competitionName,
    season: season[0],
    table: table.rows,
    tableRowsSeen: table.seen,
    matches: parseMatches(html, years),
  };
}

function parseCompetitionName(html: string) {
  const header = html.match(
    /<td colspan="14" class="main">[\s\S]*?<b>([\s\S]*?)<\/b>/,
  );
  return header ? cleanText(header[1]) : null;
}

function parseTable(html: string): { rows: NinetyMinutRow[]; seen: number } {
  const start = html.indexOf('class="main2"');
  if (start === -1) return { rows: [], seen: 0 };

  const end = html.indexOf("</table>", start);
  const section = html.slice(start, end === -1 ? undefined : end);
  const rows = section.match(
    /<tr align="center" bgcolor="#[0-9A-Fa-f]{6}">[\s\S]*?<\/tr>/g,
  );
  if (!rows) return { rows: [], seen: 0 };

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

  return { rows: parsed, seen: rows.length };
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

type RoundSegment = {
  html: string;
  round?: number;
  dateLabel?: string;
  // Termin zastępczy dla meczów, przy których 90minut nie podał jeszcze daty.
  fallbackDate: number | null;
};

// Nagłówek kolejki to osobna tabela wpleciona między tabele meczów,
// więc kolejkę meczu da się ustalić tylko czytając dokument po kolei.
const ROUND_HEADER =
  /<b><u>\s*Kolejka\s+(\d+)\s*(?:-\s*([^<]*?))?\s*<\/u><\/b>/g;

function splitIntoRounds(html: string, years: [number, number]): RoundSegment[] {
  const headers = [...html.matchAll(ROUND_HEADER)];
  if (headers.length === 0) {
    return [{ html, fallbackDate: null }];
  }

  const segments: RoundSegment[] = [];
  // Mecze sprzed pierwszego nagłówka nie należą do żadnej kolejki,
  // więc zostają przy własnych datach albo odpadają.
  if (headers[0].index > 0) {
    segments.push({ html: html.slice(0, headers[0].index), fallbackDate: null });
  }

  headers.forEach((header, index) => {
    const start = header.index + header[0].length;
    const end = headers[index + 1]?.index ?? html.length;
    const dateLabel = cleanText(header[2] ?? "") || undefined;

    segments.push({
      html: html.slice(start, end),
      round: Number(header[1]),
      dateLabel,
      fallbackDate: dateLabel ? parseRoundDate(dateLabel, years) : null,
    });
  });

  return segments;
}

// Zakres w nagłówku ma postać „8-9 sierpnia" albo „2 listopada".
// Cokolwiek innego zostawiamy — zgadywanie terminu byłoby gorsze niż jego brak.
function parseRoundDate(label: string, years: [number, number]) {
  const parsed = label.match(
    /^(\d{1,2})(?:\s*-\s*\d{1,2})?\s+([A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ]+)$/,
  );
  if (!parsed) return null;

  const month = MONTHS[parsed[2].toLowerCase()];
  if (!month) return null;

  return polishDateToUtc(
    seasonYear(month, years),
    month,
    Number(parsed[1]),
    12,
    0,
  );
}

function seasonYear(month: number, years: [number, number]) {
  return month >= 7 ? years[0] : years[1];
}

function parseMatches(
  html: string,
  years: [number, number],
): NinetyMinutMatch[] {
  return splitIntoRounds(html, years).flatMap((segment) =>
    parseRoundMatches(segment, years),
  );
}

function parseRoundMatches(
  segment: RoundSegment,
  years: [number, number],
): NinetyMinutMatch[] {
  // Wiersze meczów i notatek mają align="left"; znacznik walkowera
  // siedzi w wierszu bez atrybutów, dlatego bierzemy oba warianty.
  const rows = segment.html.match(/<tr(?: align="left")?>[\s\S]*?<\/tr>/g);
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
    const ownDate = parseMatchDate(cleanText(cells[3][1]), years);
    const date = ownDate ?? segment.fallbackDate;
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
      dateConfirmed: ownDate !== null,
      round: segment.round,
      roundDateLabel: segment.dateLabel,
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

  return polishDateToUtc(
    seasonYear(month, years),
    month,
    Number(parsed[1]),
    parsed[3] ? Number(parsed[3]) : 12,
    parsed[4] ? Number(parsed[4]) : 0,
  );
}
