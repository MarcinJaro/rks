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

// Nagłówek kolejki siedzi na 90minut w osobnej tabeli przeplatanej
// z tabelami meczów — dla parsera liczy się tylko sam wiersz.
function roundHeader(label: string) {
  return `<tr>
<td colspan="3">
<img src="http://img.90minut.pl/img/redarrowl.gif" width="15" height="15" align="absmiddle">
 <b><u>${label}</u></b>
</td>
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

  it("wszystkie mecze mają potwierdzony termin", () => {
    expect(page.matches.every((m) => m.dateConfirmed)).toBe(true);
  });

  it("przypisuje każdemu meczowi jego kolejkę", () => {
    expect(page.matches.every((m) => typeof m.round === "number")).toBe(true);
    expect(page.matches[0].round).toBe(1);
    expect(page.matches.at(-1)!.round).toBe(30);
    // 30 kolejek po 8 meczów.
    expect(new Set(page.matches.map((m) => m.round)).size).toBe(30);
    expect(page.matches.filter((m) => m.round === 7)).toHaveLength(8);
  });

  it("czyta zakres dat z nagłówka kolejki", () => {
    expect(page.matches[0].roundDateLabel).toBe("9-10 sierpnia");
    // Kolejka rozegrana w jeden dzień.
    expect(page.matches.find((m) => m.round === 13)!.roundDateLabel).toBe(
      "2 listopada",
    );
    expect(page.matches.find((m) => m.round === 16)!.roundDateLabel).toBe(
      "22 kwietnia",
    );
    expect(page.matches.find((m) => m.round === 17)!.roundDateLabel).toBe(
      "14-15 marca",
    );
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

  it("czyta mecze kolejek z zakresem dat, mimo braku dat przy meczach", () => {
    // Terminarz ma komplet 240 par; własne daty ma tylko pierwsza kolejka,
    // ale nagłówki kolejek 1-15 podają zakresy, więc te mecze da się zakotwiczyć.
    expect(page.matches).toHaveLength(120);
    expect(page.matches.every((m) => Number.isFinite(m.date))).toBe(true);
  });

  it("oznacza jako potwierdzone tylko mecze z własną datą", () => {
    const confirmed = page.matches.filter((m) => m.dateConfirmed);
    expect(confirmed).toHaveLength(8);
    expect(confirmed.every((m) => m.round === 1)).toBe(true);
  });

  it("liczy datę meczu bez terminu z pierwszego dnia kolejki", () => {
    const match = page.matches.find((m) => m.round === 5)!;
    expect(match.dateConfirmed).toBe(false);
    expect(match.roundDateLabel).toBe("5-6 września");
    const date = new Date(match.date);
    expect(date.getUTCFullYear()).toBe(2026);
    expect(date.getUTCMonth()).toBe(8);
    expect(date.getUTCDate()).toBe(5);
    // 12:00 czasu polskiego (letniego) to 10:00 UTC.
    expect(date.getUTCHours()).toBe(10);
  });

  it("czyta kolejkę z jedną datą w nagłówku", () => {
    const match = page.matches.find((m) => m.round === 13)!;
    expect(match.roundDateLabel).toBe("31 października");
    const date = new Date(match.date);
    expect(date.getUTCMonth()).toBe(9);
    expect(date.getUTCDate()).toBe(31);
  });

  it("pomija mecze kolejek bez zakresu dat w nagłówku", () => {
    // Kolejki 16-30 nie mają jeszcze żadnego terminu — nie ma czego pokazać.
    expect(page.matches.some((m) => (m.round ?? 0) > 15)).toBe(false);
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

describe("parseNinetyMinutPage — termin z nagłówka kolejki", () => {
  function pageWith(header: string, date: string) {
    return parseNinetyMinutPage(
      withRows(
        [
          roundHeader(header),
          matchRow("Okęcie Warszawa", "-", "KS Raszyn", date),
        ].join("\n"),
      ),
    )!;
  }

  it("mecz bez daty dostaje pierwszy dzień zakresu kolejki", () => {
    const page = pageWith("Kolejka 1 - 8-9 sierpnia", "");
    expect(page.matches).toHaveLength(1);
    const match = page.matches[0];
    expect(match.round).toBe(1);
    expect(match.roundDateLabel).toBe("8-9 sierpnia");
    expect(match.dateConfirmed).toBe(false);
    const date = new Date(match.date);
    expect(date.getUTCFullYear()).toBe(2025);
    expect(date.getUTCMonth()).toBe(7);
    expect(date.getUTCDate()).toBe(8);
    // 12:00 czasu polskiego (letniego) to 10:00 UTC.
    expect(date.getUTCHours()).toBe(10);
  });

  it("czyta nagłówek z jedną datą", () => {
    const page = pageWith("Kolejka 13 - 2 listopada", "");
    const match = page.matches[0];
    expect(match.round).toBe(13);
    expect(match.roundDateLabel).toBe("2 listopada");
    const date = new Date(match.date);
    expect(date.getUTCFullYear()).toBe(2025);
    expect(date.getUTCMonth()).toBe(10);
    expect(date.getUTCDate()).toBe(2);
    // 12:00 czasu polskiego (zimowego) to 11:00 UTC.
    expect(date.getUTCHours()).toBe(11);
  });

  it("kolejka wiosenna trafia w drugi rok sezonu", () => {
    const page = pageWith("Kolejka 17 - 14-15 marca", "");
    const date = new Date(page.matches[0].date);
    expect(date.getUTCFullYear()).toBe(2026);
    expect(date.getUTCMonth()).toBe(2);
    expect(date.getUTCDate()).toBe(14);
  });

  it("własna data meczu wygrywa z zakresem kolejki", () => {
    const page = pageWith("Kolejka 1 - 8-9 sierpnia", "16 września, 19:00");
    const match = page.matches[0];
    expect(match.dateConfirmed).toBe(true);
    expect(match.round).toBe(1);
    expect(match.roundDateLabel).toBe("8-9 sierpnia");
    const date = new Date(match.date);
    expect(date.getUTCMonth()).toBe(8);
    expect(date.getUTCDate()).toBe(16);
    expect(date.getUTCHours()).toBe(17);
  });

  it("pomija mecz bez daty w kolejce bez zakresu", () => {
    expect(pageWith("Kolejka 16", "").matches).toHaveLength(0);
  });

  it("nie zgaduje terminu przy nietypowym zakresie", () => {
    expect(pageWith("Kolejka 5 - termin do ustalenia", "").matches).toHaveLength(
      0,
    );
  });

  it("pomija mecz bez daty spoza kolejek", () => {
    const page = parseNinetyMinutPage(
      withRows(matchRow("Okęcie Warszawa", "-", "KS Raszyn", "")),
    )!;
    expect(page.matches).toHaveLength(0);
  });

  it("nie miesza kolejek przy kilku nagłówkach", () => {
    const page = parseNinetyMinutPage(
      withRows(
        [
          roundHeader("Kolejka 1 - 8-9 sierpnia"),
          matchRow("Okęcie Warszawa", "-", "KS Raszyn", ""),
          roundHeader("Kolejka 2 - 15-16 sierpnia"),
          matchRow("KS Raszyn", "-", "Okęcie Warszawa", ""),
        ].join("\n"),
      ),
    )!;
    expect(page.matches).toHaveLength(2);
    expect(page.matches.map((m) => m.round)).toEqual([1, 2]);
    expect(new Date(page.matches[1].date).getUTCDate()).toBe(15);
  });

  it("nie dopina notatki z poprzedniej kolejki", () => {
    const page = parseNinetyMinutPage(
      withRows(
        [
          roundHeader("Kolejka 1 - 8-9 sierpnia"),
          matchRow("Okęcie Warszawa", "-", "KS Raszyn", ""),
          roundHeader("Kolejka 2 - 15-16 sierpnia"),
          '<tr align="left"><td colspan="4"><i>terminarz w trakcie ustalania</i></td></tr>',
        ].join("\n"),
      ),
    )!;
    expect(page.matches[0].note).toBeUndefined();
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
