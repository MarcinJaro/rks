import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseViriumPage, parseViriumTeamIdFromUrl } from "./virium";

const html = readFileSync(
  new URL("./__fixtures__/virium-team.html", import.meta.url),
  "utf8",
);

function withNextData(payload: unknown) {
  return `<html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(
    payload,
  )}</script></body></html>`;
}

function scheduleHtml(schedule: unknown) {
  return withNextData({ props: { pageProps: { team: { schedule } } } });
}

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

  it("czyta wszystkie mecze z terminarza wraz z wynikami", () => {
    const page = parseViriumPage(html)!;
    expect(page.matches).toHaveLength(7);

    const first = page.matches[0];
    expect(first.homeTeam).toBe("RKS Okęcie");
    expect(first.awayTeam).toBe("Ursus Warszawa");
    expect(first.result).toBe("3:1");
    expect(first.date).toBe(Date.parse("2023-11-18T12:00:57.017+01:00"));

    expect(page.matches.every((m) => /^\d+:\d+$/.test(m.result ?? ""))).toBe(
      true,
    );
  });

  it("zwraca null gdy brak __NEXT_DATA__", () => {
    expect(parseViriumPage("<html></html>")).toBeNull();
  });

  it("zwraca null gdy __NEXT_DATA__ nie jest poprawnym JSON-em", () => {
    expect(
      parseViriumPage(
        '<script id="__NEXT_DATA__" type="application/json">{ nie-json </script>',
      ),
    ).toBeNull();
  });

  it("zwraca pustą listę gdy drużyna nie ma terminarza", () => {
    expect(parseViriumPage(withNextData({ props: { pageProps: {} } }))).toEqual({
      matches: [],
    });
  });

  it("zostawia wynik pusty dla meczu jeszcze nierozegranego", () => {
    const page = parseViriumPage(
      scheduleHtml([
        {
          id: "abc",
          date: "2026-09-05T11:00:00.000+02:00",
          team1: { name: "RKS Okęcie" },
          team2: { name: "Ursus Warszawa" },
          status: 0,
        },
      ]),
    )!;

    expect(page.matches).toHaveLength(1);
    expect(page.matches[0].result).toBeUndefined();
    expect(page.matches[0].date).toBe(
      Date.parse("2026-09-05T11:00:00.000+02:00"),
    );
  });

  it("pomija wpisy bez identyfikatora, drużyn albo daty", () => {
    const page = parseViriumPage(
      scheduleHtml([
        { date: "2026-09-05T11:00:00.000+02:00", team1: { name: "A" }, team2: { name: "B" } },
        { id: "x", date: "2026-09-05T11:00:00.000+02:00", team2: { name: "B" } },
        { id: "y", date: "nie-data", team1: { name: "A" }, team2: { name: "B" } },
        {
          id: "z",
          date: "2026-09-05T11:00:00.000+02:00",
          team1: { name: "A" },
          team2: { name: "B" },
        },
      ]),
    )!;

    expect(page.matches.map((m) => m.sourceMatchId)).toEqual(["z"]);
  });
});
