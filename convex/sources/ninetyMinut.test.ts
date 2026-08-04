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

// Minimalna strona o strukturze 90minut — do testowania przypadków brzegowych,
// których nie ma w zapisanych próbkach.
function withRows(rows: string) {
  return `<html><body>
<table class="main2">
<tr>
<td colspan="14" class="main">
<b>Testowa Liga okręgowa 2025/2026, grupa: Warszawa II</b>
</td>
</tr>
</table>
<table>
${rows}
</table>
</body></html>`;
}

function matchRow(home: string, score: string, away: string, date: string) {
  return `<tr align="left">
<td nowrap valign="top" width="180">  ${home}  </td>
<td nowrap valign="top" align="center" width="50">${score}</td>
<td nowrap valign="top" width="180">  ${away}  </td>
<td valign="top" nowrap align="left" width="190">${date}</td>
</tr>`;
}

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

  it("zachowuje nawias w nazwie drużyny", () => {
    expect(normalizeTeamName("SEMP Ursynów (Warszawa)")).toBe(
      "semp ursynow (warszawa)",
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

  it("czyta wszystkie kolumny wiersza tabeli", () => {
    const leader = page.table[0];
    expect(leader).toEqual({
      position: 1,
      name: "Ursus II Warszawa",
      played: 30,
      points: 69,
      wins: 22,
      draws: 3,
      losses: 5,
      goalsFor: 80,
      goalsAgainst: 32,
    });
  });

  it("pomija wiersz nagłówka tabeli", () => {
    expect(
      page.table.some((row) => normalizeTeamName(row.name) === "nazwa"),
    ).toBe(false);
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

  it("czyta komplet meczów sezonu", () => {
    // 16 drużyn, 30 kolejek, 8 meczów na kolejkę.
    expect(page.matches.length).toBe(240);
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

  it("dopina notatkę do poprzedzającego meczu", () => {
    const match = page.matches.find(
      (m) =>
        normalizeTeamName(m.homeTeam).includes("champion") &&
        normalizeTeamName(m.awayTeam).includes("okecie"),
    );
    expect(match!.note).toBe(
      "w Głoskowie / w pierwotnym terminie (27 sierpnia, 19:00) odwołany",
    );
  });

  it("nie robi notatki z nagłówka kolejki", () => {
    expect(page.matches.some((m) => m.note?.startsWith("Kolejka"))).toBe(false);
  });

  it("oznacza mecz wygrany walkowerem", () => {
    const walkovers = page.matches.filter((m) => m.walkover);
    expect(walkovers).toHaveLength(2);
    const first = walkovers[0];
    expect(normalizeTeamName(first.homeTeam)).toBe("ursus ii warszawa");
    expect(normalizeTeamName(first.awayTeam)).toBe("lks osuchow");
    expect(first.result).toBe("3:0");
    expect(first.note).toBe("goście nie dojechali");
  });

  it("nie oznacza zwykłych meczów jako walkower", () => {
    const normal = page.matches.find(
      (m) =>
        normalizeTeamName(m.homeTeam).includes("champion") &&
        normalizeTeamName(m.awayTeam).includes("okecie"),
    );
    expect(normal!.walkover).toBeUndefined();
  });

  it("zachowuje nawias w nazwie drużyny", () => {
    const match = page.matches.find((m) =>
      m.homeTeam.startsWith("SEMP Ursynów"),
    );
    expect(match!.homeTeam).toBe("SEMP Ursynów (Warszawa)");
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

  it("przepisuje pozycję z poprzedniego wiersza, gdy komórka jest pusta", () => {
    // Przy komplecie remisów 90minut pokazuje numer tylko przy pierwszej drużynie.
    expect(page.table).toHaveLength(16);
    expect(page.table.every((row) => row.position === 1)).toBe(true);
  });

  it("pomija mecze bez wyznaczonego terminu", () => {
    // Terminarz ma komplet 240 par, ale daty ma na razie tylko pierwsza kolejka.
    expect(page.matches).toHaveLength(8);
    expect(page.matches.every((m) => Number.isFinite(m.date))).toBe(true);
  });
});

describe("parseNinetyMinutPage — przypadki brzegowe", () => {
  it("mecz bez godziny dostaje domyślne południe", () => {
    const page = parseNinetyMinutPage(
      withRows(matchRow("Okęcie Warszawa", "-", "KS Raszyn", "6 września")),
    )!;
    expect(page.matches).toHaveLength(1);
    const date = new Date(page.matches[0].date);
    expect(date.getUTCFullYear()).toBe(2025);
    expect(date.getUTCMonth()).toBe(8);
    expect(date.getUTCDate()).toBe(6);
    // 12:00 czasu polskiego (letniego) to 10:00 UTC.
    expect(date.getUTCHours()).toBe(10);
  });

  it("nie przypina notatki do meczu sprzed pominiętego wiersza", () => {
    const page = parseNinetyMinutPage(
      withRows(
        [
          matchRow("Okęcie Warszawa", "2-1", "KS Raszyn", "6 września, 15:00"),
          matchRow("Milan Milanówek", "-", "Unia Warszawa", ""),
          '<tr align="left"><td colspan="4"><i>w Milanówku</i></td></tr>',
        ].join("\n"),
      ),
    )!;
    expect(page.matches).toHaveLength(1);
    expect(page.matches[0].note).toBeUndefined();
  });

  it("łączy kilka notatek pod jednym meczem", () => {
    const page = parseNinetyMinutPage(
      withRows(
        [
          matchRow("Okęcie Warszawa", "2-1", "KS Raszyn", "6 września, 15:00"),
          '<tr align="left"><td colspan="4"><i>w Raszynie</i></td></tr>',
          '<tr align="left"><td colspan="4"><i>bez publiczności</i></td></tr>',
        ].join("\n"),
      ),
    )!;
    expect(page.matches[0].note).toBe("w Raszynie / bez publiczności");
  });

  it("czyta miesiąc bez polskich znaków", () => {
    const page = parseNinetyMinutPage(
      withRows(matchRow("Okęcie Warszawa", "-", "KS Raszyn", "4 pazdziernika, 11:00")),
    )!;
    expect(new Date(page.matches[0].date).getUTCMonth()).toBe(9);
  });

  it("pomija wiersz z nieznanym miesiącem", () => {
    const page = parseNinetyMinutPage(
      withRows(matchRow("Okęcie Warszawa", "-", "KS Raszyn", "4 mgliste, 11:00")),
    )!;
    expect(page.matches).toHaveLength(0);
  });
});

describe("parseNinetyMinutPage — dane niepoprawne", () => {
  it("zwraca null dla pustego HTML", () => {
    expect(parseNinetyMinutPage("<html></html>")).toBeNull();
  });

  it("zwraca null, gdy w nagłówku nie ma sezonu", () => {
    expect(
      parseNinetyMinutPage(
        '<table class="main2"><tr><td colspan="14" class="main"><b>Liga okręgowa</b></td></tr></table>',
      ),
    ).toBeNull();
  });
});
