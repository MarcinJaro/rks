# Sync meczów i tabel (90minut + virium) — plan implementacji

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatyczny sync terminarzy, wyników i tabel ligowych z 90minut.pl (seniorzy, seniorzy II) oraz virium (rocznik 2012), sterowany z panelu admina, z tabelą ligową na `/wyniki`.

**Architecture:** Parsery jako czyste funkcje w `convex/sources/*` (testowane na zapisanych próbkach HTML), orkiestracja w `convex/matchesSync.ts` (izolacja per źródło), konfiguracja źródeł w tabeli `syncSources` edytowanej z `/admin/druzyny`, tabela ligowa w `standings`, przełącznik auto-syncu w `appSettings`.

**Tech Stack:** Convex 1.37, Next.js 16 (App Router), React 19, TypeScript 5, vitest 4 + convex-test 0.0.54, Tailwind 4.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-03-lnp-sync-design.md` — obowiązuje wersja po rewizji z 2026-08-04.
- **Nigdy nie odpytujemy `competition-api-pro.laczynaspilka.pl`** ani nie obchodzimy reCAPTCHA. LNP występuje wyłącznie jako link dla użytkownika.
- Convex: składnia obiektowa (`{ args, handler }`), walidatory przy każdej publicznej funkcji, `requireAdmin(ctx)` z `convex/adminAuth.ts` przy każdej funkcji admina. Przed pisaniem kodu Convex przeczytaj `convex/_generated/ai/guidelines.md`.
- Teksty widoczne dla użytkownika po polsku, bez emoji (zgodnie z konwencją repo).
- Testy: `npm test` (vitest, environment `edge-runtime`). Typecheck: `npm run typecheck`.
- Praca na gałęzi `feature/match-sync-90minut` odbitej od `admin-panel`. Commit po każdym tasku.
- Nie polegamy na ICU w runtime Convexa: dekodowanie ISO-8859-2 własną tablicą znaków.

---

## Struktura plików

**Nowe:**
- `convex/sources/encoding.ts` — dekoder ISO-8859-2 + `htmlDecode`, `stripTags`, `cleanText`.
- `convex/sources/polishTime.ts` — `polishDateToUtc(year, month, day, hour, minute)` z obsługą czasu letniego.
- `convex/sources/ninetyMinut.ts` — parser strony ligi 90minut (tabela + mecze).
- `convex/sources/virium.ts` — parser `__NEXT_DATA__` (port z API route).
- `convex/sources/__fixtures__/liga14256.html` — sezon rozegrany (wyniki + pełna tabela).
- `convex/sources/__fixtures__/liga14871.html` — sezon świeży (bez wyników, zerowa tabela).
- `convex/sources/__fixtures__/virium-team.html` — próbka strony virium.
- `convex/sources/ninetyMinut.test.ts`, `convex/sources/virium.test.ts`, `convex/sources/polishTime.test.ts`.
- `convex/syncSources.ts` — CRUD źródeł + `parseSourceUrl`.
- `convex/syncSources.test.ts`.
- `convex/standings.ts` — zapis i odczyt tabel.
- `convex/appSettings.ts` — flaga auto-syncu.
- `convex/matchesSync.test.ts` — testy orkiestracji.
- `src/components/home/StandingsTable.tsx` — widok tabeli ligowej.
- `src/app/admin/(panel)/druzyny/TeamSources.tsx` — sekcja źródeł w module drużyn.

**Modyfikowane:**
- `convex/schema.ts` — `syncSources`, `standings`, `appSettings`, `ninetyminut` w `source`.
- `convex/matchesSync.ts` — przepisany: `syncAll` + wyzwalacze, bez starych scraperów.
- `convex/crons.ts` — cron woła `syncAll`.
- `convex/matches.ts` — usunięcie martwego `upsertFromLnp`; `center` czyta drużyny z bazy.
- `src/app/admin/(panel)/mecze/page.tsx` — panel syncu.
- `src/app/admin/(panel)/druzyny/page.tsx` — osadzenie `TeamSources`.
- `src/components/home/MatchCenter.tsx` — zakładki z bazy + sekcja tabeli.

**Usuwane:**
- `src/app/api/rks-matches/route.ts`, `src/data/matchSources.ts`, fallback `PublicMatchCenter` w `MatchCenter.tsx`.

---

### Task 1: Schemat bazy

**Files:**
- Modify: `convex/schema.ts`
- Test: `convex/schema.test.ts`

**Interfaces:**
- Produces: tabele `syncSources`, `standings`, `appSettings`; wartość `"ninetyminut"` w unii `source` tabeli `matches`.

- [ ] **Step 1: Napisz failujący test**

Utwórz `convex/schema.test.ts`:

```ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "./schema";

describe("schema", () => {
  it("przyjmuje źródło synchronizacji", async () => {
    const t = convexTest(schema);
    const id = await t.run(async (ctx) => {
      const teamId = await ctx.db.insert("teams", {
        name: "Seniorzy",
        slug: "seniorzy",
        isActive: true,
        sortOrder: 0,
      });
      return await ctx.db.insert("syncSources", {
        teamId,
        kind: "ninetyminut",
        url: "http://www.90minut.pl/liga/1/liga14871.html",
        externalId: "14871",
        teamNameOnSource: "Okęcie Warszawa",
        matchType: "liga",
        enabled: true,
      });
    });
    expect(id).toBeDefined();
  });

  it("przyjmuje tabelę ligową i ustawienie", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      const teamId = await ctx.db.insert("teams", {
        name: "Seniorzy",
        slug: "seniorzy",
        isActive: true,
        sortOrder: 0,
      });
      await ctx.db.insert("standings", {
        teamId,
        competitionName: "Keeza Liga okręgowa 2026/2027, grupa: Warszawa II",
        season: "2026/2027",
        rows: [
          {
            position: 1,
            name: "Okęcie Warszawa",
            played: 1,
            points: 3,
            wins: 1,
            draws: 0,
            losses: 0,
            goalsFor: 2,
            goalsAgainst: 0,
            isRks: true,
          },
        ],
        syncedAt: 1,
        sourceUrl: "http://www.90minut.pl/liga/1/liga14871.html",
      });
      await ctx.db.insert("appSettings", {
        key: "autoSyncEnabled",
        boolValue: true,
      });
    });
  });
});
```

- [ ] **Step 2: Uruchom test — ma failować**

Run: `npm test -- convex/schema.test.ts`
Expected: FAIL — `Object contains extra field 'kind' that is not in the validator` lub podobny błąd o nieznanej tabeli.

- [ ] **Step 3: Dodaj tabele do schematu**

W `convex/schema.ts`, w unii `source` tabeli `matches` (linia ~114) dopisz `v.literal("ninetyminut"),` jako pierwszą pozycję unii. Następnie po definicji `matchEvents` (po linii 166) dodaj:

```ts
  syncSources: defineTable({
    teamId: v.id("teams"),
    kind: v.union(v.literal("ninetyminut"), v.literal("virium")),
    url: v.string(),
    externalId: v.string(),
    teamNameOnSource: v.string(),
    matchType: v.union(
      v.literal("liga"),
      v.literal("sparing"),
      v.literal("turniej"),
      v.literal("puchar"),
    ),
    enabled: v.boolean(),
    lastSyncedAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
  }).index("by_team", ["teamId"]),

  standings: defineTable({
    teamId: v.id("teams"),
    competitionName: v.string(),
    season: v.string(),
    rows: v.array(
      v.object({
        position: v.number(),
        name: v.string(),
        played: v.number(),
        points: v.number(),
        wins: v.number(),
        draws: v.number(),
        losses: v.number(),
        goalsFor: v.number(),
        goalsAgainst: v.number(),
        isRks: v.boolean(),
      }),
    ),
    syncedAt: v.number(),
    sourceUrl: v.optional(v.string()),
  }).index("by_team", ["teamId"]),

  appSettings: defineTable({
    key: v.string(),
    boolValue: v.optional(v.boolean()),
    stringValue: v.optional(v.string()),
    numberValue: v.optional(v.number()),
  }).index("by_key", ["key"]),
```

- [ ] **Step 4: Uruchom testy — mają przejść**

Run: `npm test -- convex/schema.test.ts`
Expected: PASS (2 testy)

- [ ] **Step 5: Commit**

```bash
git add convex/schema.ts convex/schema.test.ts
git commit -m "Add syncSources, standings and appSettings tables"
```

---

### Task 2: Dekodowanie ISO-8859-2 i czyszczenie HTML

**Files:**
- Create: `convex/sources/encoding.ts`
- Test: `convex/sources/encoding.test.ts`

**Interfaces:**
- Produces: `decodeIso88592(bytes: Uint8Array): string`, `stripTags(v: string): string`, `htmlDecode(v: string): string`, `cleanText(v: string): string`.

- [ ] **Step 1: Napisz failujący test**

`convex/sources/encoding.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { cleanText, decodeIso88592, htmlDecode, stripTags } from "./encoding";

describe("decodeIso88592", () => {
  it("dekoduje polskie znaki", () => {
    // "Okęcie" w ISO-8859-2: O k ę(0xEA) c i e
    const bytes = new Uint8Array([0x4f, 0x6b, 0xea, 0x63, 0x69, 0x65]);
    expect(decodeIso88592(bytes)).toBe("Okęcie");
  });

  it("dekoduje pozostałe polskie diakrytyki", () => {
    const bytes = new Uint8Array([0xb1, 0xe6, 0xb3, 0xf1, 0xf3, 0xb6, 0xbf, 0xac]);
    expect(decodeIso88592(bytes)).toBe("ąćłńóśżŹ");
  });

  it("zostawia ASCII bez zmian", () => {
    const bytes = new Uint8Array([0x41, 0x42, 0x43]);
    expect(decodeIso88592(bytes)).toBe("ABC");
  });
});

describe("cleanText", () => {
  it("zdejmuje tagi, encje i nadmiarowe spacje", () => {
    expect(cleanText("<b>  Okęcie&nbsp;Warszawa  </b>")).toBe("Okęcie Warszawa");
  });

  it("stripTags zamienia tagi na spacje", () => {
    expect(stripTags("<b>a</b><i>b</i>").trim()).toBe("a  b".trim());
  });

  it("htmlDecode rozwija encje", () => {
    expect(htmlDecode("a&amp;b&quot;c")).toBe('a&b"c');
  });
});
```

- [ ] **Step 2: Uruchom test — ma failować**

Run: `npm test -- convex/sources/encoding.test.ts`
Expected: FAIL — `Cannot find module './encoding'`

- [ ] **Step 3: Zaimplementuj**

`convex/sources/encoding.ts`:

```ts
// Górna połowa ISO-8859-2 (0xA0-0xFF). Nie polegamy na TextDecoder,
// bo runtime Convexa nie gwarantuje pełnej tablicy kodowań ICU.
const HIGH_RANGE =
  " Ą˘Ł¤ĽŚ§¨ŠŞŤŹ­ŽŻ" +
  "°ą˛ł´ľśˇ¸šşťź˝žż" +
  "ŔÁÂĂÄĹĆÇČÉĘËĚÍÎĎ" +
  "ĐŃŇÓÔŐÖ×ŘŮÚŰÜÝŢß" +
  "ŕáâăäĺćçčéęëěíîď" +
  "đńňóôőö÷řůúűüýţ˙";

export function decodeIso88592(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) {
    out += byte < 0xa0 ? String.fromCharCode(byte) : HIGH_RANGE[byte - 0xa0];
  }
  return out;
}

export function stripTags(value = "") {
  return value.replace(/<[^>]+>/g, " ");
}

export function htmlDecode(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

export function cleanText(value = "") {
  return htmlDecode(stripTags(value)).replace(/\s+/g, " ").trim();
}
```

- [ ] **Step 4: Uruchom test — ma przejść**

Run: `npm test -- convex/sources/encoding.test.ts`
Expected: PASS (6 testów)

- [ ] **Step 5: Commit**

```bash
git add convex/sources/encoding.ts convex/sources/encoding.test.ts
git commit -m "Add ISO-8859-2 decoder and HTML text helpers"
```

---

### Task 3: Czas polski (letni/zimowy)

**Files:**
- Create: `convex/sources/polishTime.ts`
- Test: `convex/sources/polishTime.test.ts`

**Interfaces:**
- Produces: `polishDateToUtc(year: number, month: number, day: number, hour: number, minute: number): number` — month 1-12, zwraca timestamp ms.

- [ ] **Step 1: Napisz failujący test**

`convex/sources/polishTime.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { polishDateToUtc } from "./polishTime";

describe("polishDateToUtc", () => {
  it("stosuje czas letni (UTC+2) w sierpniu", () => {
    expect(polishDateToUtc(2026, 8, 9, 11, 0)).toBe(
      Date.UTC(2026, 7, 9, 9, 0),
    );
  });

  it("stosuje czas zimowy (UTC+1) w listopadzie", () => {
    expect(polishDateToUtc(2026, 11, 15, 13, 30)).toBe(
      Date.UTC(2026, 10, 15, 12, 30),
    );
  });

  it("stosuje czas zimowy w marcu przed zmianą", () => {
    expect(polishDateToUtc(2027, 3, 14, 12, 0)).toBe(
      Date.UTC(2027, 2, 14, 11, 0),
    );
  });

  it("stosuje czas letni w kwietniu po zmianie", () => {
    expect(polishDateToUtc(2027, 4, 4, 11, 0)).toBe(
      Date.UTC(2027, 3, 4, 9, 0),
    );
  });
});
```

- [ ] **Step 2: Uruchom test — ma failować**

Run: `npm test -- convex/sources/polishTime.test.ts`
Expected: FAIL — `Cannot find module './polishTime'`

- [ ] **Step 3: Zaimplementuj**

`convex/sources/polishTime.ts`:

```ts
// Czas letni w UE: od ostatniej niedzieli marca 01:00 UTC
// do ostatniej niedzieli października 01:00 UTC.
function lastSundayUtc(year: number, month: number) {
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  const offsetToSunday = lastDay.getUTCDay();
  return Date.UTC(year, month, lastDay.getUTCDate() - offsetToSunday, 1, 0);
}

function isSummerTime(utcGuess: number, year: number) {
  return (
    utcGuess >= lastSundayUtc(year, 2) && utcGuess < lastSundayUtc(year, 9)
  );
}

export function polishDateToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
) {
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  // Przybliżenie wystarcza: granice zmiany czasu wypadają nocą,
  // a mecze nie są rozgrywane między 01:00 a 04:00.
  const offsetHours = isSummerTime(naive, year) ? 2 : 1;
  return naive - offsetHours * 60 * 60 * 1000;
}
```

- [ ] **Step 4: Uruchom test — ma przejść**

Run: `npm test -- convex/sources/polishTime.test.ts`
Expected: PASS (4 testy)

- [ ] **Step 5: Commit**

```bash
git add convex/sources/polishTime.ts convex/sources/polishTime.test.ts
git commit -m "Add Polish timezone conversion with DST handling"
```

---

### Task 4: Parser 90minut

**Files:**
- Create: `convex/sources/ninetyMinut.ts`
- Create: `convex/sources/__fixtures__/liga14256.html`, `convex/sources/__fixtures__/liga14871.html`
- Test: `convex/sources/ninetyMinut.test.ts`

**Interfaces:**
- Consumes: `decodeIso88592`, `cleanText` (Task 2), `polishDateToUtc` (Task 3).
- Produces:
```ts
export type NinetyMinutRow = {
  position: number; name: string; played: number; points: number;
  wins: number; draws: number; losses: number;
  goalsFor: number; goalsAgainst: number;
};
export type NinetyMinutMatch = {
  homeTeam: string; awayTeam: string; date: number;
  result?: string; note?: string; matchUrl?: string;
};
export type NinetyMinutPage = {
  competitionName: string; season: string;
  table: NinetyMinutRow[]; matches: NinetyMinutMatch[];
};
export function parseNinetyMinutPage(html: string): NinetyMinutPage | null;
export function parseLeagueIdFromUrl(url: string): string | null;
export function normalizeTeamName(value: string): string;
```

- [ ] **Step 1: Zapisz próbki HTML**

Pobierz dwie strony i zapisz jako fixture (UTF-8, przycięte do ~40 KB, żeby test był szybki):

```bash
mkdir -p convex/sources/__fixtures__
curl -s "http://www.90minut.pl/liga/1/liga14256.html" | iconv -f ISO-8859-2 -t UTF-8 | head -c 120000 > convex/sources/__fixtures__/liga14256.html
curl -s "http://www.90minut.pl/liga/1/liga14871.html" | iconv -f ISO-8859-2 -t UTF-8 | head -c 120000 > convex/sources/__fixtures__/liga14871.html
```

Sprawdź, że w każdym pliku jest nagłówek ligi i co najmniej jedna kolejka:

```bash
grep -c "Kolejka" convex/sources/__fixtures__/liga14256.html
```
Expected: liczba > 0

- [ ] **Step 2: Napisz failujący test**

`convex/sources/ninetyMinut.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  parseLeagueIdFromUrl,
  parseNinetyMinutPage,
  normalizeTeamName,
} from "./ninetyMinut";

const playedSeason = readFileSync(
  new URL("./__fixtures__/liga14256.html", import.meta.url),
  "utf8",
);
const freshSeason = readFileSync(
  new URL("./__fixtures__/liga14871.html", import.meta.url),
  "utf8",
);

describe("parseLeagueIdFromUrl", () => {
  it("wyciąga id ligi", () => {
    expect(
      parseLeagueIdFromUrl("http://www.90minut.pl/liga/1/liga14871.html"),
    ).toBe("14871");
  });

  it("zwraca null dla obcego adresu", () => {
    expect(parseLeagueIdFromUrl("https://example.com/liga.html")).toBeNull();
  });
});

describe("normalizeTeamName", () => {
  it("normalizuje diakrytyki i wielkość liter", () => {
    expect(normalizeTeamName("  Okęcie Warszawa ")).toBe("okecie warszawa");
  });

  it("rozróżnia pierwszą i drugą drużynę", () => {
    expect(normalizeTeamName("Okęcie II Warszawa")).not.toBe(
      normalizeTeamName("Okęcie Warszawa"),
    );
  });
});

describe("parseNinetyMinutPage — sezon rozegrany", () => {
  const page = parseNinetyMinutPage(playedSeason)!;

  it("czyta nazwę rozgrywek i sezon", () => {
    expect(page.competitionName).toContain("Liga okręgowa");
    expect(page.season).toBe("2025/2026");
  });

  it("czyta pełną tabelę", () => {
    expect(page.table.length).toBe(16);
    const first = page.table[0];
    expect(first.position).toBe(1);
    expect(first.name.length).toBeGreaterThan(0);
    expect(first.points).toBeGreaterThan(0);
    expect(first.goalsFor).toBeGreaterThan(0);
  });

  it("zawiera Okęcie w tabeli", () => {
    const rks = page.table.find((row) =>
      normalizeTeamName(row.name).includes("okecie"),
    );
    expect(rks).toBeDefined();
    expect(rks!.played).toBeGreaterThan(0);
  });

  it("czyta mecze z wynikami", () => {
    expect(page.matches.length).toBeGreaterThan(50);
    const withResult = page.matches.filter((m) => m.result);
    expect(withResult.length).toBeGreaterThan(50);
    expect(withResult[0].result).toMatch(/^\d+:\d+$/);
  });

  it("mecz pierwszej kolejki ma poprawne drużyny i datę", () => {
    const match = page.matches.find(
      (m) =>
        normalizeTeamName(m.homeTeam).includes("champion") &&
        normalizeTeamName(m.awayTeam).includes("okecie"),
    );
    expect(match).toBeDefined();
    expect(match!.result).toBe("2:4");
    expect(new Date(match!.date).getUTCFullYear()).toBe(2025);
    expect(match!.matchUrl).toContain("laczynaspilka.pl");
  });

  it("przypisuje rok wg sezonu — mecze wiosenne w drugim roku", () => {
    const spring = page.matches.filter(
      (m) => new Date(m.date).getUTCMonth() < 6,
    );
    expect(spring.length).toBeGreaterThan(0);
    expect(new Date(spring[0].date).getUTCFullYear()).toBe(2026);
  });
});

describe("parseNinetyMinutPage — sezon świeży", () => {
  const page = parseNinetyMinutPage(freshSeason)!;

  it("czyta tabelę z zerami", () => {
    expect(page.table.length).toBeGreaterThan(0);
    expect(page.table.every((row) => row.played === 0)).toBe(true);
  });

  it("czyta mecze bez wyniku", () => {
    expect(page.matches.length).toBeGreaterThan(0);
    expect(page.matches.every((m) => !m.result)).toBe(true);
  });
});

describe("parseNinetyMinutPage — dane niepoprawne", () => {
  it("zwraca null dla pustego HTML", () => {
    expect(parseNinetyMinutPage("<html></html>")).toBeNull();
  });
});
```

- [ ] **Step 3: Uruchom test — ma failować**

Run: `npm test -- convex/sources/ninetyMinut.test.ts`
Expected: FAIL — `Cannot find module './ninetyMinut'`

- [ ] **Step 4: Zaimplementuj parser**

`convex/sources/ninetyMinut.ts`:

```ts
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
  const rows = section.match(/<tr align="center" bgcolor="#[0-9A-Fa-f]{6}">[\s\S]*?<\/tr>/g);
  if (!rows) return [];

  return rows
    .map(parseTableRow)
    .filter((row): row is NinetyMinutRow => Boolean(row));
}

function parseTableRow(row: string): NinetyMinutRow | null {
  const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((cell) =>
    cleanText(cell[1]),
  );
  if (cells.length < 8) return null;

  const position = Number(cells[0].replace(".", ""));
  const name = cells[1];
  if (!Number.isFinite(position) || !name) return null;

  const goals = cells[7].match(/(\d+)\s*-\s*(\d+)/);
  if (!goals) return null;

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
  const rows = html.match(/<tr align="left">[\s\S]*?<\/tr>/g);
  if (!rows) return [];

  const matches: NinetyMinutMatch[] = [];

  for (const row of rows) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)];

    // Wiersz notatki: jedna komórka colspan=4 pod ostatnim meczem.
    if (cells.length === 1 && /colspan="4"/.test(row)) {
      const note = cleanText(cells[0][1]);
      const previous = matches[matches.length - 1];
      if (previous && note) previous.note = note;
      continue;
    }

    if (cells.length < 4) continue;

    const homeTeam = cleanText(cells[0][1]);
    const awayTeam = cleanText(cells[2][1]);
    const date = parseMatchDate(cleanText(cells[3][1]), years);
    if (!homeTeam || !awayTeam || date === null) continue;

    const scoreCell = cells[1][1];
    const result = cleanText(scoreCell).match(/(\d+)\s*-\s*(\d+)/);
    const matchUrl = scoreCell.match(/href="([^"]+)"/)?.[1];

    matches.push({
      homeTeam,
      awayTeam,
      date,
      result: result ? `${result[1]}:${result[2]}` : undefined,
      matchUrl,
    });
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
```

- [ ] **Step 5: Uruchom test — ma przejść**

Run: `npm test -- convex/sources/ninetyMinut.test.ts`
Expected: PASS (wszystkie testy). Jeśli liczba drużyn w tabeli różni się od 16, popraw asercję do faktycznej liczby z fixture — ale najpierw sprawdź, czy parser nie gubi wierszy.

- [ ] **Step 6: Commit**

```bash
git add convex/sources/ninetyMinut.ts convex/sources/ninetyMinut.test.ts convex/sources/__fixtures__
git commit -m "Add 90minut league page parser with fixtures"
```

---

### Task 5: Parser virium

**Files:**
- Create: `convex/sources/virium.ts`
- Create: `convex/sources/__fixtures__/virium-team.html`
- Test: `convex/sources/virium.test.ts`

**Interfaces:**
- Produces: `parseViriumPage(html: string): { matches: ViriumMatch[] } | null`, `parseViriumTeamIdFromUrl(url: string): string | null`; `ViriumMatch = { sourceMatchId: string; homeTeam: string; awayTeam: string; date: number; result?: string }`.

- [ ] **Step 1: Zapisz próbkę**

```bash
curl -s -A "Mozilla/5.0" "https://web.virium.pl/rssport/teams/03ea137c-d0e4-4739-be1b-d5d95fe28977" > convex/sources/__fixtures__/virium-team.html
grep -c "__NEXT_DATA__" convex/sources/__fixtures__/virium-team.html
```
Expected: 1

Jeśli plik nie zawiera `__NEXT_DATA__` (strona zmieniła technologię), przerwij ten task i zgłoś to — virium wymaga wtedy osobnego rozpoznania.

- [ ] **Step 2: Napisz failujący test**

`convex/sources/virium.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseViriumPage, parseViriumTeamIdFromUrl } from "./virium";

const html = readFileSync(
  new URL("./__fixtures__/virium-team.html", import.meta.url),
  "utf8",
);

describe("parseViriumTeamIdFromUrl", () => {
  it("wyciąga uuid drużyny", () => {
    expect(
      parseViriumTeamIdFromUrl(
        "https://web.virium.pl/rssport/teams/03ea137c-d0e4-4739-be1b-d5d95fe28977",
      ),
    ).toBe("03ea137c-d0e4-4739-be1b-d5d95fe28977");
  });

  it("zwraca null dla obcego adresu", () => {
    expect(parseViriumTeamIdFromUrl("https://example.com/x")).toBeNull();
  });
});

describe("parseViriumPage", () => {
  it("czyta mecze z __NEXT_DATA__", () => {
    const page = parseViriumPage(html);
    expect(page).not.toBeNull();
    expect(page!.matches.length).toBeGreaterThan(0);
    const match = page!.matches[0];
    expect(match.homeTeam.length).toBeGreaterThan(0);
    expect(match.awayTeam.length).toBeGreaterThan(0);
    expect(Number.isFinite(match.date)).toBe(true);
    expect(match.sourceMatchId.length).toBeGreaterThan(0);
  });

  it("zwraca null gdy brak __NEXT_DATA__", () => {
    expect(parseViriumPage("<html></html>")).toBeNull();
  });
});
```

- [ ] **Step 3: Uruchom test — ma failować**

Run: `npm test -- convex/sources/virium.test.ts`
Expected: FAIL — `Cannot find module './virium'`

- [ ] **Step 4: Zaimplementuj (port logiki z `src/app/api/rks-matches/route.ts:166-226`)**

`convex/sources/virium.ts`:

```ts
import { htmlDecode } from "./encoding";

export type ViriumMatch = {
  sourceMatchId: string;
  homeTeam: string;
  awayTeam: string;
  date: number;
  result?: string;
};

export function parseViriumTeamIdFromUrl(url: string) {
  return (
    url.match(
      /virium\.pl\/[^/]+\/teams\/([0-9a-f-]{36})/i,
    )?.[1] ?? null
  );
}

export function parseViriumPage(html: string): { matches: ViriumMatch[] } | null {
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
  const date = typeof entry.date === "string" ? new Date(entry.date).getTime() : NaN;

  if (!homeTeam || !awayTeam || !sourceMatchId || !Number.isFinite(date)) {
    return null;
  }

  const score = isRecord(entry.result) && isRecord(entry.result.fullTimeScore)
    ? entry.result.fullTimeScore
    : {};
  const home = typeof score.team1 === "number" ? score.team1 : undefined;
  const away = typeof score.team2 === "number" ? score.team2 : undefined;

  return {
    sourceMatchId,
    homeTeam,
    awayTeam,
    date,
    result: home !== undefined && away !== undefined ? `${home}:${away}` : undefined,
  };
}

function getRecord(value: unknown, key: string): Record<string, unknown> {
  const record = isRecord(value) ? value[key] : undefined;
  return isRecord(record) ? record : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
```

- [ ] **Step 5: Uruchom test — ma przejść**

Run: `npm test -- convex/sources/virium.test.ts`
Expected: PASS (4 testy)

- [ ] **Step 6: Commit**

```bash
git add convex/sources/virium.ts convex/sources/virium.test.ts convex/sources/__fixtures__/virium-team.html
git commit -m "Port virium parser into Convex sources"
```

---

### Task 6: Konfiguracja źródeł (`syncSources`)

**Files:**
- Create: `convex/syncSources.ts`
- Test: `convex/syncSources.test.ts`

**Interfaces:**
- Consumes: `parseLeagueIdFromUrl` (Task 4), `parseViriumTeamIdFromUrl` (Task 5), `requireAdmin`.
- Produces: `detectSource(url)`; funkcje Convex `listByTeam`, `listEnabled` (internalQuery), `add`, `update`, `remove`, `markResult` (internalMutation).

- [ ] **Step 1: Napisz failujący test**

`convex/syncSources.test.ts`:

```ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { detectSource } from "./syncSources";

const asAdmin = { subject: "admin|1", issuer: "https://example.com" };

async function seedTeam(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) =>
    ctx.db.insert("teams", {
      name: "Seniorzy",
      slug: "seniorzy",
      isActive: true,
      sortOrder: 0,
    }),
  );
}

describe("detectSource", () => {
  it("rozpoznaje 90minut", () => {
    expect(detectSource("http://www.90minut.pl/liga/1/liga14871.html")).toEqual({
      kind: "ninetyminut",
      externalId: "14871",
    });
  });

  it("rozpoznaje virium", () => {
    expect(
      detectSource("https://web.virium.pl/rssport/teams/03ea137c-d0e4-4739-be1b-d5d95fe28977"),
    ).toEqual({
      kind: "virium",
      externalId: "03ea137c-d0e4-4739-be1b-d5d95fe28977",
    });
  });

  it("zwraca null dla nieobsługiwanego adresu", () => {
    expect(detectSource("https://example.com/liga")).toBeNull();
  });
});

describe("syncSources", () => {
  it("wymaga admina do dodania źródła", async () => {
    const t = convexTest(schema);
    const teamId = await seedTeam(t);
    await expect(
      t.mutation(api.syncSources.add, {
        teamId,
        url: "http://www.90minut.pl/liga/1/liga14871.html",
        teamNameOnSource: "Okęcie Warszawa",
        matchType: "liga",
      }),
    ).rejects.toThrow();
  });

  it("dodaje źródło i wykrywa rodzaj", async () => {
    const t = convexTest(schema);
    const teamId = await seedTeam(t);
    const admin = t.withIdentity(asAdmin);

    await admin.mutation(api.syncSources.add, {
      teamId,
      url: "http://www.90minut.pl/liga/1/liga14871.html",
      teamNameOnSource: "Okęcie Warszawa",
      matchType: "liga",
    });

    const sources = await admin.query(api.syncSources.listByTeam, { teamId });
    expect(sources).toHaveLength(1);
    expect(sources[0].kind).toBe("ninetyminut");
    expect(sources[0].externalId).toBe("14871");
    expect(sources[0].enabled).toBe(true);
  });

  it("odrzuca nieobsługiwany adres", async () => {
    const t = convexTest(schema);
    const teamId = await seedTeam(t);
    const admin = t.withIdentity(asAdmin);

    await expect(
      admin.mutation(api.syncSources.add, {
        teamId,
        url: "https://example.com/cokolwiek",
        teamNameOnSource: "Okęcie",
        matchType: "liga",
      }),
    ).rejects.toThrow(/Nieobsługiwany adres/);
  });

  it("listEnabled zwraca tylko włączone źródła", async () => {
    const t = convexTest(schema);
    const teamId = await seedTeam(t);
    const admin = t.withIdentity(asAdmin);

    await admin.mutation(api.syncSources.add, {
      teamId,
      url: "http://www.90minut.pl/liga/1/liga14871.html",
      teamNameOnSource: "Okęcie Warszawa",
      matchType: "liga",
    });
    const [source] = await admin.query(api.syncSources.listByTeam, { teamId });
    await admin.mutation(api.syncSources.update, {
      sourceId: source._id,
      enabled: false,
    });

    const enabled = await t.query(internal.syncSources.listEnabled, {});
    expect(enabled).toHaveLength(0);
  });

  it("markResult zapisuje błąd", async () => {
    const t = convexTest(schema);
    const teamId = await seedTeam(t);
    const admin = t.withIdentity(asAdmin);

    await admin.mutation(api.syncSources.add, {
      teamId,
      url: "http://www.90minut.pl/liga/1/liga14871.html",
      teamNameOnSource: "Okęcie Warszawa",
      matchType: "liga",
    });
    const [source] = await admin.query(api.syncSources.listByTeam, { teamId });

    await t.mutation(internal.syncSources.markResult, {
      sourceId: source._id,
      error: "Serwis zwrócił 500",
    });

    const [updated] = await admin.query(api.syncSources.listByTeam, { teamId });
    expect(updated.lastError).toBe("Serwis zwrócił 500");
    expect(updated.lastSyncedAt).toBeDefined();
  });
});
```

- [ ] **Step 2: Uruchom test — ma failować**

Run: `npm test -- convex/syncSources.test.ts`
Expected: FAIL — `Cannot find module './syncSources'`

- [ ] **Step 3: Zaimplementuj**

`convex/syncSources.ts`:

```ts
import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
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
```

- [ ] **Step 4: Uruchom test — ma przejść**

Run: `npm test -- convex/syncSources.test.ts`
Expected: PASS (8 testów)

- [ ] **Step 5: Commit**

```bash
git add convex/syncSources.ts convex/syncSources.test.ts
git commit -m "Add syncSources configuration with URL detection"
```

---

### Task 7: Tabela ligowa i ustawienia

**Files:**
- Create: `convex/standings.ts`, `convex/appSettings.ts`
- Test: `convex/standings.test.ts`

**Interfaces:**
- Produces: `standings.replace` (internalMutation, args: `teamId`, `competitionName`, `season`, `rows`, `sourceUrl`), `standings.byTeam` (query, args: `teamId`), `appSettings.getAutoSync` (query), `appSettings.readAutoSync` (internalQuery), `appSettings.setAutoSync` (mutation, admin).

- [ ] **Step 1: Napisz failujący test**

`convex/standings.test.ts`:

```ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const asAdmin = { subject: "admin|1", issuer: "https://example.com" };

const row = {
  position: 1,
  name: "Okęcie Warszawa",
  played: 2,
  points: 6,
  wins: 2,
  draws: 0,
  losses: 0,
  goalsFor: 5,
  goalsAgainst: 1,
  isRks: true,
};

async function seedTeam(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) =>
    ctx.db.insert("teams", {
      name: "Seniorzy",
      slug: "seniorzy",
      isActive: true,
      sortOrder: 0,
    }),
  );
}

describe("standings", () => {
  it("zapisuje tabelę i zwraca ją publicznie", async () => {
    const t = convexTest(schema);
    const teamId = await seedTeam(t);

    await t.mutation(internal.standings.replace, {
      teamId,
      competitionName: "Liga okręgowa",
      season: "2026/2027",
      rows: [row],
      sourceUrl: "http://www.90minut.pl/liga/1/liga14871.html",
    });

    const table = await t.query(api.standings.byTeam, { teamId });
    expect(table).not.toBeNull();
    expect(table!.rows).toHaveLength(1);
    expect(table!.rows[0].isRks).toBe(true);
  });

  it("podmienia istniejącą tabelę zamiast dopisywać", async () => {
    const t = convexTest(schema);
    const teamId = await seedTeam(t);

    await t.mutation(internal.standings.replace, {
      teamId,
      competitionName: "Liga okręgowa",
      season: "2026/2027",
      rows: [row],
    });
    await t.mutation(internal.standings.replace, {
      teamId,
      competitionName: "Liga okręgowa",
      season: "2026/2027",
      rows: [{ ...row, points: 9 }],
    });

    const all = await t.run(async (ctx) => ctx.db.query("standings").collect());
    expect(all).toHaveLength(1);
    expect(all[0].rows[0].points).toBe(9);
  });

  it("odrzuca pustą tabelę, żeby nie skasować dobrych danych", async () => {
    const t = convexTest(schema);
    const teamId = await seedTeam(t);

    await t.mutation(internal.standings.replace, {
      teamId,
      competitionName: "Liga okręgowa",
      season: "2026/2027",
      rows: [row],
    });
    await expect(
      t.mutation(internal.standings.replace, {
        teamId,
        competitionName: "Liga okręgowa",
        season: "2026/2027",
        rows: [],
      }),
    ).rejects.toThrow(/pusta/i);

    const table = await t.query(api.standings.byTeam, { teamId });
    expect(table!.rows).toHaveLength(1);
  });
});

describe("appSettings", () => {
  it("domyślnie auto-sync jest włączony", async () => {
    const t = convexTest(schema);
    expect(await t.query(api.appSettings.getAutoSync, {})).toBe(true);
  });

  it("admin może wyłączyć auto-sync", async () => {
    const t = convexTest(schema);
    const admin = t.withIdentity(asAdmin);

    await admin.mutation(api.appSettings.setAutoSync, { enabled: false });
    expect(await t.query(api.appSettings.getAutoSync, {})).toBe(false);

    await admin.mutation(api.appSettings.setAutoSync, { enabled: true });
    expect(await t.query(api.appSettings.getAutoSync, {})).toBe(true);
  });

  it("bez admina nie da się zmienić ustawienia", async () => {
    const t = convexTest(schema);
    await expect(
      t.mutation(api.appSettings.setAutoSync, { enabled: false }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Uruchom test — ma failować**

Run: `npm test -- convex/standings.test.ts`
Expected: FAIL — `Cannot find module './standings'`

- [ ] **Step 3: Zaimplementuj**

`convex/standings.ts`:

```ts
import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

const standingsRow = v.object({
  position: v.number(),
  name: v.string(),
  played: v.number(),
  points: v.number(),
  wins: v.number(),
  draws: v.number(),
  losses: v.number(),
  goalsFor: v.number(),
  goalsAgainst: v.number(),
  isRks: v.boolean(),
});

export const replace = internalMutation({
  args: {
    teamId: v.id("teams"),
    competitionName: v.string(),
    season: v.string(),
    rows: v.array(standingsRow),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.rows.length === 0) {
      throw new Error("Tabela jest pusta — pomijam zapis.");
    }

    const existing = await ctx.db
      .query("standings")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .first();

    const fields = {
      teamId: args.teamId,
      competitionName: args.competitionName,
      season: args.season,
      rows: args.rows,
      sourceUrl: args.sourceUrl,
      syncedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, fields);
      return existing._id;
    }

    return await ctx.db.insert("standings", fields);
  },
});

export const byTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, { teamId }) => {
    return await ctx.db
      .query("standings")
      .withIndex("by_team", (q) => q.eq("teamId", teamId))
      .first();
  },
});
```

`convex/appSettings.ts`:

```ts
import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { requireAdmin } from "./adminAuth";

const AUTO_SYNC_KEY = "autoSyncEnabled";

async function readFlag(ctx: QueryCtx) {
  const setting = await ctx.db
    .query("appSettings")
    .withIndex("by_key", (q) => q.eq("key", AUTO_SYNC_KEY))
    .first();
  return setting?.boolValue ?? true;
}

export const getAutoSync = query({
  args: {},
  handler: async (ctx) => await readFlag(ctx),
});

export const readAutoSync = internalQuery({
  args: {},
  handler: async (ctx) => await readFlag(ctx),
});

export const setAutoSync = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, { enabled }) => {
    await requireAdmin(ctx);

    const existing = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", AUTO_SYNC_KEY))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { boolValue: enabled });
      return;
    }

    await ctx.db.insert("appSettings", { key: AUTO_SYNC_KEY, boolValue: enabled });
  },
});
```

- [ ] **Step 4: Uruchom test — ma przejść**

Run: `npm test -- convex/standings.test.ts`
Expected: PASS (6 testów)

- [ ] **Step 5: Commit**

```bash
git add convex/standings.ts convex/appSettings.ts convex/standings.test.ts
git commit -m "Add standings storage and auto-sync setting"
```

---

### Task 8: Orkiestracja syncu

**Files:**
- Modify: `convex/matchesSync.ts` (przepisany od zera), `convex/crons.ts`, `convex/matches.ts` (usunięcie `upsertFromLnp`)
- Test: `convex/matchesSync.test.ts`

**Interfaces:**
- Consumes: `parseNinetyMinutPage`, `normalizeTeamName` (Task 4), `parseViriumPage` (Task 5), `internal.syncSources.listEnabled`/`markResult` (Task 6), `internal.standings.replace` (Task 7), `internal.appSettings.readAutoSync` (Task 7), `internal.matches.upsertFromSource` (istniejące).
- Produces: `syncAll` (internalAction, args `{ force?: boolean }`, zwraca `{ results: Array<{ sourceId, teamName, upserted, error? }> }`), `triggerSync` (action, admin), `buildMatchId(leagueId, home, away)`.

- [ ] **Step 1: Napisz failujący test**

`convex/matchesSync.test.ts`:

```ts
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { buildMatchId } from "./matchesSync";

const leagueHtmlUtf8 = readFileSync(
  new URL("./sources/__fixtures__/liga14256.html", import.meta.url),
  "utf8",
);

const asAdmin = { subject: "admin|1", issuer: "https://example.com" };

function mockFetchReturning(html: string, ok = true) {
  // 90minut serwuje ISO-8859-2, więc sync czyta arrayBuffer.
  // Do testu wystarczy zwrócić bajty w tym kodowaniu dla znaków ASCII
  // i zamienić polskie znaki na ich odpowiedniki latin2.
  const bytes = new Uint8Array(
    [...html].map((char) => {
      const code = char.charCodeAt(0);
      if (code < 0xa0) return code;
      const latin2 =
        " Ą˘Ł¤ĽŚ§¨ŠŞŤŹ­ŽŻ°ą˛ł´ľśˇ¸šşťź˝žżŔÁÂĂÄĹĆÇČÉĘËĚÍÎĎĐŃŇÓÔŐÖ×ŘŮÚŰÜÝŢßŕáâăäĺćçčéęëěíîďđńňóôőö÷řůúűüýţ˙".indexOf(
          char,
        );
      return latin2 >= 0 ? 0xa0 + latin2 : 0x3f;
    }),
  );

  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok,
      status: ok ? 200 : 500,
      arrayBuffer: async () => bytes.buffer,
      text: async () => html,
    })),
  );
}

async function seedTeamWithSource(t: ReturnType<typeof convexTest>) {
  const teamId = await t.run(async (ctx) =>
    ctx.db.insert("teams", {
      name: "Seniorzy",
      slug: "seniorzy",
      isActive: true,
      sortOrder: 0,
    }),
  );
  await t.withIdentity(asAdmin).mutation(api.syncSources.add, {
    teamId,
    url: "http://www.90minut.pl/liga/1/liga14256.html",
    teamNameOnSource: "Okęcie Warszawa",
    matchType: "liga",
  });
  return teamId;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buildMatchId", () => {
  it("buduje stabilny klucz niezależny od wyniku", () => {
    expect(buildMatchId("14256", "Champion Warszawa", "Okęcie Warszawa")).toBe(
      "90minut:14256:champion warszawa-okecie warszawa",
    );
  });
});

describe("syncAll", () => {
  it("zapisuje mecze naszej drużyny i tabelę", async () => {
    const t = convexTest(schema);
    const teamId = await seedTeamWithSource(t);
    mockFetchReturning(leagueHtmlUtf8);

    const result = await t.action(internal.matchesSync.syncAll, { force: true });
    expect(result.results[0].error).toBeUndefined();
    expect(result.results[0].upserted).toBeGreaterThan(0);

    const matches = await t.run(async (ctx) => ctx.db.query("matches").collect());
    expect(matches.length).toBeGreaterThan(0);
    expect(
      matches.every(
        (match) =>
          match.homeTeam.includes("Okęcie") || match.awayTeam.includes("Okęcie"),
      ),
    ).toBe(true);
    expect(matches.every((match) => match.teamId === teamId)).toBe(true);

    const table = await t.query(api.standings.byTeam, { teamId });
    expect(table!.rows.length).toBeGreaterThan(0);
    expect(table!.rows.some((row) => row.isRks)).toBe(true);
  });

  it("nie duplikuje meczów przy powtórnym uruchomieniu", async () => {
    const t = convexTest(schema);
    await seedTeamWithSource(t);
    mockFetchReturning(leagueHtmlUtf8);

    await t.action(internal.matchesSync.syncAll, { force: true });
    const first = await t.run(async (ctx) => ctx.db.query("matches").collect());
    await t.action(internal.matchesSync.syncAll, { force: true });
    const second = await t.run(async (ctx) => ctx.db.query("matches").collect());

    expect(second).toHaveLength(first.length);
  });

  it("zapisuje błąd źródła, gdy serwis odpowie błędem", async () => {
    const t = convexTest(schema);
    const teamId = await seedTeamWithSource(t);
    mockFetchReturning("", false);

    const result = await t.action(internal.matchesSync.syncAll, { force: true });
    expect(result.results[0].error).toBeTruthy();

    const [source] = await t
      .withIdentity(asAdmin)
      .query(api.syncSources.listByTeam, { teamId });
    expect(source.lastError).toBeTruthy();
  });

  it("pomija sync gdy auto-sync wyłączony i brak force", async () => {
    const t = convexTest(schema);
    await seedTeamWithSource(t);
    mockFetchReturning(leagueHtmlUtf8);
    await t.withIdentity(asAdmin).mutation(api.appSettings.setAutoSync, {
      enabled: false,
    });

    const result = await t.action(internal.matchesSync.syncAll, {});
    expect(result.skipped).toBe(true);
    expect(result.results).toHaveLength(0);
  });

  it("triggerSync wymaga admina", async () => {
    const t = convexTest(schema);
    await seedTeamWithSource(t);
    await expect(t.action(api.matchesSync.triggerSync, {})).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Uruchom test — ma failować**

Run: `npm test -- convex/matchesSync.test.ts`
Expected: FAIL — `buildMatchId is not exported` / stary plik nie ma `syncAll`.

- [ ] **Step 3: Przepisz `convex/matchesSync.ts`**

Zastąp CAŁĄ zawartość pliku:

```ts
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
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

export function buildMatchId(leagueId: string, home: string, away: string) {
  return `90minut:${leagueId}:${normalizeTeamName(home)}-${normalizeTeamName(away)}`;
}

export const syncAll = internalAction({
  args: { force: v.optional(v.boolean()) },
  handler: async (
    ctx,
    { force },
  ): Promise<{ skipped: boolean; results: SyncSourceResult[] }> => {
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
  handler: async (
    ctx,
  ): Promise<{ skipped: boolean; results: SyncSourceResult[] }> => {
    await requireAdmin(ctx);
    return await ctx.runAction(internal.matchesSync.syncAll, { force: true });
  },
});

type SourceDoc = {
  _id: string;
  teamId: string;
  url: string;
  externalId: string;
  teamNameOnSource: string;
  matchType: "liga" | "sparing" | "turniej" | "puchar";
};

async function syncNinetyMinut(
  ctx: { runMutation: (fn: unknown, args: unknown) => Promise<unknown> },
  source: SourceDoc,
) {
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
      sourceMatchId: buildMatchId(source.externalId, match.homeTeam, match.awayTeam),
      sourceCompetitionId: source.externalId,
      sourceUrl: match.matchUrl ?? source.url,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      date: match.date,
      venue: match.note,
      result: match.result,
      matchType: source.matchType,
      status: match.result
        ? "finished"
        : match.date > Date.now()
          ? "upcoming"
          : "finished",
      teamId: source.teamId,
    });
  }

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

async function syncVirium(
  ctx: { runMutation: (fn: unknown, args: unknown) => Promise<unknown> },
  source: SourceDoc,
) {
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
      status: match.result
        ? "finished"
        : match.date > Date.now()
          ? "upcoming"
          : "finished",
      teamId: source.teamId,
    });
  }

  return page.matches.length;
}
```

- [ ] **Step 4: Dostosuj `upsertFromSource` do przyjmowania `teamId`**

W `convex/matches.ts` w `upsertFromSource` (linia 192) zamień argument `teamSlug` na `teamId` i usuń wyszukiwanie po slugu:

- w `args` zamień `teamSlug: v.optional(v.string()),` na `teamId: v.optional(v.id("teams")),`
- usuń blok `const team = args.teamSlug ? ... : null;`
- w `fields` zamień `teamId: team?._id,` na `teamId: args.teamId,`

W tym samym pliku usuń całą funkcję `upsertFromLnp` (linie ~148-190) — jest martwa.

- [ ] **Step 5: Podepnij cron**

W `convex/crons.ts` zamień wywołanie:

```ts
crons.interval(
  "sync match results",
  { hours: 6 },
  internal.matchesSync.syncAll,
  {},
);
```

- [ ] **Step 6: Uruchom testy — mają przejść**

Run: `npm test`
Expected: PASS — wszystkie pliki testowe.

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: brak błędów. Jeśli pojawi się błąd o typie `ctx` w `syncNinetyMinut`/`syncVirium`, zamień sygnaturę na `ctx: ActionCtx` z importem `import type { ActionCtx } from "./_generated/server";`.

- [ ] **Step 8: Commit**

```bash
git add convex/matchesSync.ts convex/matchesSync.test.ts convex/matches.ts convex/crons.ts
git commit -m "Rewrite match sync around configured sources"
```

---

### Task 9: Panel admina — źródła przy drużynie

**Files:**
- Create: `src/app/admin/(panel)/druzyny/TeamSources.tsx`
- Modify: `src/app/admin/(panel)/druzyny/page.tsx`

**Interfaces:**
- Consumes: `api.syncSources.listByTeam`, `api.syncSources.add`, `api.syncSources.update`, `api.syncSources.remove`.
- Produces: komponent `<TeamSources teamId={Id<"teams">} />`.

- [ ] **Step 1: Przeczytaj istniejący moduł drużyn**

Run: `sed -n '1,80p' "src/app/admin/(panel)/druzyny/page.tsx"`
Cel: poznać wzorzec formularzy, klas Tailwind i obsługi błędów w tym module. Nowy komponent ma wyglądać jak reszta panelu.

- [ ] **Step 2: Napisz komponent**

`src/app/admin/(panel)/druzyny/TeamSources.tsx` — komponent kliencki (`"use client"`), który:
- pobiera źródła: `useQuery(api.syncSources.listByTeam, { teamId })`,
- renderuje listę: adres (jako link), rodzaj (`90minut` / `virium`), nazwa drużyny u źródła, typ meczu, stan (włączone/wyłączone), data ostatniego syncu (`toLocaleString("pl-PL")`) i `lastError` w czerwonej ramce, gdy jest,
- ma przy każdym źródle przyciski „Włącz"/„Wyłącz" (`api.syncSources.update`) i „Usuń" (`api.syncSources.remove`, z `window.confirm`),
- ma formularz dodawania: pole „Adres źródła" (placeholder `http://www.90minut.pl/liga/1/liga14871.html`), pole „Nazwa drużyny u źródła" (placeholder `Okęcie Warszawa`), select typu meczu (liga/puchar/sparing/turniej), przycisk „Dodaj źródło",
- błąd z mutacji (np. `Nieobsługiwany adres…`) pokazuje pod formularzem, nie rzuca w konsolę,
- pod formularzem ma jednozdaniową podpowiedź: `Wklej link do strony ligi na 90minut.pl albo do drużyny na virium.pl. Nazwa drużyny musi być dokładnie taka, jak na stronie źródła.`

- [ ] **Step 3: Osadź w module drużyn**

W `src/app/admin/(panel)/druzyny/page.tsx` wyrenderuj `<TeamSources teamId={team._id} />` w widoku edycji drużyny (tam, gdzie edytowane są jej pozostałe pola).

- [ ] **Step 4: Sprawdź typy i lint**

Run: `npm run typecheck && npm run lint`
Expected: brak błędów.

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/(panel)/druzyny"
git commit -m "Add data source management to team admin module"
```

---

### Task 10: Panel admina — sterowanie syncem

**Files:**
- Modify: `src/app/admin/(panel)/mecze/page.tsx`

**Interfaces:**
- Consumes: `api.matchesSync.triggerSync`, `api.appSettings.getAutoSync`, `api.appSettings.setAutoSync`.

- [ ] **Step 1: Dodaj pasek synchronizacji**

Nad listą meczów w `src/app/admin/(panel)/mecze/page.tsx` dodaj sekcję zawierającą:
- przełącznik „Synchronizacja automatyczna (co 6 godzin)" — checkbox sterowany `useQuery(api.appSettings.getAutoSync)` i `useMutation(api.appSettings.setAutoSync)`,
- przycisk „Synchronizuj teraz" wywołujący `useAction(api.matchesSync.triggerSync)`; w trakcie działania ma być nieaktywny z etykietą „Synchronizuję…",
- po zakończeniu: podsumowanie per źródło w formie listy — adres, liczba zapisanych meczów, a przy błędzie jego treść na czerwono,
- gdy `results` jest puste, komunikat: `Brak włączonych źródeł. Dodaj je w module Drużyny.`

- [ ] **Step 2: Sprawdź typy i lint**

Run: `npm run typecheck && npm run lint`
Expected: brak błędów.

- [ ] **Step 3: Commit**

```bash
git add "src/app/admin/(panel)/mecze/page.tsx"
git commit -m "Add sync controls to matches admin page"
```

---

### Task 11: Strona publiczna — tabela ligowa i zakładki z bazy

**Files:**
- Create: `src/components/home/StandingsTable.tsx`
- Modify: `src/components/home/MatchCenter.tsx`, `convex/matches.ts` (query `center`), `convex/teams.ts` (query listy drużyn — jeśli brak, dodać)

**Interfaces:**
- Consumes: `api.standings.byTeam`, istniejące `api.matches.center`.
- Produces: `<StandingsTable teamId={Id<"teams">} />`.

- [ ] **Step 1: Sprawdź, jak MatchCenter buduje zakładki**

Run: `sed -n '160,270p' src/components/home/MatchCenter.tsx`
Cel: znaleźć `TeamSelector` i miejsce, gdzie używa `matchCenterTeams` z `src/data/matchSources.ts`.

- [ ] **Step 2: Napisz komponent tabeli**

`src/components/home/StandingsTable.tsx` (`"use client"`):
- `const table = useQuery(api.standings.byTeam, { teamId })`,
- gdy `undefined` → szkielet ładowania; gdy `null` → nie renderuje nic,
- nagłówek: `table.competitionName`,
- tabela z kolumnami: `#`, `Drużyna`, `M`, `Pkt`, `Z`, `R`, `P`, `Bramki` (jako `goalsFor-goalsAgainst`),
- wiersz z `isRks: true` wyróżniony (pogrubienie + tło akcentu zgodne z resztą strony),
- pod tabelą: `Dane: 90minut.pl` z linkiem do `table.sourceUrl` (jeśli jest) oraz data aktualizacji z `syncedAt`,
- cała tabela owinięta w kontener `overflow-x-auto`, żeby na telefonie nie rozpychała strony.

- [ ] **Step 3: Podepnij tabelę i zakładki z bazy**

W `MatchCenter.tsx`:
- zakładki drużyn buduj z danych z bazy (drużyny aktywne, posortowane po `sortOrder`) zamiast z `matchCenterTeams`,
- pod listą wyników wyrenderuj `<StandingsTable teamId={selectedTeamId} />` dla wybranej drużyny,
- usuń fallback `PublicMatchCenter` i wywołania `/api/rks-matches`; źródłem danych jest wyłącznie Convex.

- [ ] **Step 4: Sprawdź typy i lint**

Run: `npm run typecheck && npm run lint`
Expected: brak błędów.

- [ ] **Step 5: Commit**

```bash
git add src/components/home convex/matches.ts convex/teams.ts
git commit -m "Show league standings and database-driven team tabs"
```

---

### Task 12: Sprzątanie martwych ścieżek

**Files:**
- Delete: `src/app/api/rks-matches/route.ts`, `src/data/matchSources.ts`

- [ ] **Step 1: Sprawdź, czy nic ich nie importuje**

Run: `grep -rn "rks-matches\|matchSources" src/ convex/ --include="*.ts" --include="*.tsx"`
Expected: brak wyników (poza ewentualnie plikami, które usuwasz w tym kroku).

- [ ] **Step 2: Usuń pliki**

```bash
git rm src/app/api/rks-matches/route.ts src/data/matchSources.ts
```

- [ ] **Step 3: Pełna weryfikacja**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: wszystko przechodzi.

- [ ] **Step 4: Commit**

```bash
git commit -m "Remove duplicated scraping route and static source registry"
```

---

### Task 13: Weryfikacja end-to-end i konfiguracja produkcyjna

- [ ] **Step 1: Uruchom aplikację i sprawdź stronę wyników**

Uruchom dev server przez `preview_start` (nigdy przez Bash) i otwórz `/wyniki`. Zweryfikuj: zakładki drużyn, lista meczów, tabela ligowa, brak błędów w konsoli.

- [ ] **Step 2: Skonfiguruj źródła w panelu**

W `/admin/druzyny` dodaj:
- Seniorzy → `http://www.90minut.pl/liga/1/liga14871.html`, nazwa `Okęcie Warszawa`, typ `liga`
- Seniorzy II → `http://www.90minut.pl/liga/1/liga14945.html`, nazwa `Okęcie II Warszawa`, typ `liga`
- Rocznik 2012 → `https://web.virium.pl/rssport/teams/03ea137c-d0e4-4739-be1b-d5d95fe28977`, nazwa drużyny z virium, typ `liga`

- [ ] **Step 3: Uruchom sync z panelu i zweryfikuj wynik**

W `/admin/mecze` kliknij „Synchronizuj teraz", sprawdź podsumowanie, potem `/wyniki` — mecze i tabela mają się pojawić.

- [ ] **Step 4: Zrzut ekranu jako dowód**

Zrób screenshot `/wyniki` z widoczną tabelą i dołącz go do podsumowania pracy.

---

## Self-review planu

**Pokrycie specu:** schemat (Task 1), parsery 90minut/virium (4, 5), konfiguracja źródeł w adminie (6, 9), standings + flaga (7), orkiestracja z izolacją błędów i cron (8), panel syncu (10), tabela i zakładki na stronie (11), sprzątanie (12), E2E (13). Ręczne wpisywanie roczników działa na istniejącym CRUD-zie — bez zmian, zgodnie ze specem.

**Ryzyka wykonawcze:**
- Liczba drużyn w tabeli fixture (16) może się różnić — Task 4 Step 5 mówi, co wtedy zrobić.
- Struktura `__NEXT_DATA__` na virium mogła się zmienić — Task 5 Step 1 każe przerwać i zgłosić zamiast zgadywać.
- `upsertFromSource` zmienia kontrakt (`teamSlug` → `teamId`) — jedyny konsument to nowy `matchesSync`, ale Task 8 Step 6/7 to weryfikuje testami i typecheckiem.
