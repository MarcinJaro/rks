import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "./schema";

describe("schema", () => {
  it("deklaruje tabele synchronizacji", () => {
    expect(Object.keys(schema.tables)).toEqual(
      expect.arrayContaining(["syncSources", "standings", "appSettings"]),
    );
  });

  it("dopuszcza źródło ninetyminut w meczach", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("matches", {
        homeTeam: "Okęcie Warszawa",
        awayTeam: "Champion Warszawa",
        date: 1,
        matchType: "liga",
        status: "upcoming",
        source: "ninetyminut",
      });
    });
  });

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
      const sourceId = await ctx.db.insert("syncSources", {
        teamId,
        kind: "ninetyminut",
        url: "http://www.90minut.pl/liga/1/liga14871.html",
        externalId: "14871",
        teamNameOnSource: "Okęcie Warszawa",
        matchType: "liga",
        enabled: true,
      });
      await ctx.db.insert("standings", {
        teamId,
        sourceId,
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
