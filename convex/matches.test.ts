import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const DAY = 24 * 60 * 60 * 1000;

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

describe("centrum meczowe drużyny", () => {
  it("pokazuje nadchodzący mecz mimo 30 rozegranych wcześniej", async () => {
    const t = convexTest(schema);
    const teamId = await seedTeam(t);

    // Liga okręgowa ma 30 kolejek, więc w drugim sezonie drużyna ma już
    // komplet meczów w przeszłości.
    await t.run(async (ctx) => {
      for (let round = 1; round <= 30; round += 1) {
        await ctx.db.insert("matches", {
          homeTeam: "Okęcie Warszawa",
          awayTeam: `Rywal ${round}`,
          date: Date.now() - round * 7 * DAY,
          matchType: "liga",
          status: "finished",
          result: "2:1",
          teamId,
          dateConfirmed: true,
        });
      }
      await ctx.db.insert("matches", {
        homeTeam: "Okęcie Warszawa",
        awayTeam: "KS Raszyn",
        date: Date.now() + DAY,
        matchType: "liga",
        status: "upcoming",
        teamId,
        dateConfirmed: true,
      });
    });

    const center = await t.query(api.matches.center, { teamSlug: "seniorzy" });
    expect(center.upcoming).toHaveLength(1);
    expect(center.upcoming[0].awayTeam).toBe("KS Raszyn");
    expect(center.nextMatch?.awayTeam).toBe("KS Raszyn");
  });

  it("pokazuje wynik mimo 30 zaplanowanych meczów w przyszłości", async () => {
    const t = convexTest(schema);
    const teamId = await seedTeam(t);

    await t.run(async (ctx) => {
      for (let round = 1; round <= 30; round += 1) {
        await ctx.db.insert("matches", {
          homeTeam: "Okęcie Warszawa",
          awayTeam: `Rywal ${round}`,
          date: Date.now() + round * 7 * DAY,
          matchType: "liga",
          status: "upcoming",
          teamId,
          dateConfirmed: true,
        });
      }
      await ctx.db.insert("matches", {
        homeTeam: "Okęcie Warszawa",
        awayTeam: "KS Raszyn",
        date: Date.now() - DAY,
        matchType: "liga",
        status: "finished",
        result: "3:0",
        teamId,
        dateConfirmed: true,
      });
    });

    const center = await t.query(api.matches.center, { teamSlug: "seniorzy" });
    expect(center.latestResults).toHaveLength(1);
    expect(center.latestResults[0].result).toBe("3:0");
  });
});

describe("mecze z terminem orientacyjnym", () => {
  it("zostaje w nadchodzących, choć orientacyjna godzina już minęła", async () => {
    const t = convexTest(schema);
    const teamId = await seedTeam(t);

    // 90minut podaje przy kolejce sam zakres dni, więc orientacyjną godzinę
    // ustawiamy na 12:00 pierwszego dnia — mecz bywa grany dzień później.
    await t.run(async (ctx) => {
      await ctx.db.insert("matches", {
        homeTeam: "Piast Piastów",
        awayTeam: "Okęcie Warszawa",
        date: Date.now() - DAY,
        matchType: "liga",
        status: "upcoming",
        teamId,
        dateConfirmed: false,
        roundLabel: "2. kolejka, 15-16 sierpnia",
      });
    });

    const upcoming = await t.query(api.matches.upcoming, {});
    expect(upcoming).toHaveLength(1);

    const center = await t.query(api.matches.center, { teamSlug: "seniorzy" });
    expect(center.upcoming).toHaveLength(1);
    expect(center.nextMatch).not.toBeNull();
  });

  it("znika z nadchodzących, gdy orientacyjny termin jest dawno przeterminowany", async () => {
    const t = convexTest(schema);
    const teamId = await seedTeam(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("matches", {
        homeTeam: "Piast Piastów",
        awayTeam: "Okęcie Warszawa",
        date: Date.now() - 30 * DAY,
        matchType: "liga",
        status: "upcoming",
        teamId,
        dateConfirmed: false,
        roundLabel: "2. kolejka, 15-16 sierpnia",
      });
    });

    const upcoming = await t.query(api.matches.upcoming, {});
    expect(upcoming).toHaveLength(0);
  });

  it("mecz z potwierdzonym terminem znika zaraz po rozpoczęciu", async () => {
    const t = convexTest(schema);
    const teamId = await seedTeam(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("matches", {
        homeTeam: "Okęcie Warszawa",
        awayTeam: "KS Raszyn",
        date: Date.now() - DAY,
        matchType: "liga",
        status: "upcoming",
        teamId,
        dateConfirmed: true,
      });
    });

    const upcoming = await t.query(api.matches.upcoming, {});
    expect(upcoming).toHaveLength(0);
  });
});
