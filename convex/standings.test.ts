import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const asAdmin = { subject: "admin|1", issuer: "https://example.com", email: "admin@rksokecie.pl" };

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

async function seedSource(
  t: ReturnType<typeof convexTest>,
  teamId: Id<"teams">,
  matchType: "liga" | "puchar" = "liga",
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("syncSources", {
      teamId,
      kind: "ninetyminut",
      url: `http://www.90minut.pl/liga/1/liga${matchType === "liga" ? "14871" : "14999"}.html`,
      externalId: matchType === "liga" ? "14871" : "14999",
      teamNameOnSource: "Okęcie Warszawa",
      matchType,
      enabled: true,
    }),
  );
}

describe("standings", () => {
  it("zapisuje tabelę i zwraca ją publicznie", async () => {
    const t = convexTest(schema);
    const teamId = await seedTeam(t);
    const sourceId = await seedSource(t, teamId);

    await t.mutation(internal.standings.replace, {
      teamId,
      sourceId,
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
    const sourceId = await seedSource(t, teamId);

    await t.mutation(internal.standings.replace, {
      teamId,
      sourceId,
      competitionName: "Liga okręgowa",
      season: "2026/2027",
      rows: [row],
    });
    await t.mutation(internal.standings.replace, {
      teamId,
      sourceId,
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
    const sourceId = await seedSource(t, teamId);

    await t.mutation(internal.standings.replace, {
      teamId,
      sourceId,
      competitionName: "Liga okręgowa",
      season: "2026/2027",
      rows: [row],
    });
    await expect(
      t.mutation(internal.standings.replace, {
        teamId,
        sourceId,
        competitionName: "Liga okręgowa",
        season: "2026/2027",
        rows: [],
      }),
    ).rejects.toThrow(/pusta/i);

    const table = await t.query(api.standings.byTeam, { teamId });
    expect(table!.rows).toHaveLength(1);
  });

  it("trzyma osobną tabelę dla każdego źródła drużyny", async () => {
    const t = convexTest(schema);
    const teamId = await seedTeam(t);
    const league = await seedSource(t, teamId, "liga");
    const cup = await seedSource(t, teamId, "puchar");

    await t.mutation(internal.standings.replace, {
      teamId,
      sourceId: league,
      competitionName: "Liga okręgowa",
      season: "2026/2027",
      rows: [row],
    });
    await t.mutation(internal.standings.replace, {
      teamId,
      sourceId: cup,
      competitionName: "Puchar Polski",
      season: "2026/2027",
      rows: [{ ...row, name: "Champion Warszawa", isRks: false }],
    });

    const all = await t.run(async (ctx) => ctx.db.query("standings").collect());
    expect(all).toHaveLength(2);
  });

  it("byTeam zwraca tabelę ligową, gdy źródeł jest kilka", async () => {
    const t = convexTest(schema);
    const teamId = await seedTeam(t);
    const league = await seedSource(t, teamId, "liga");
    const cup = await seedSource(t, teamId, "puchar");

    // Puchar synchronizuje się jako ostatni — i tak ma wygrać tabela ligowa.
    await t.mutation(internal.standings.replace, {
      teamId,
      sourceId: league,
      competitionName: "Liga okręgowa",
      season: "2026/2027",
      rows: [row],
    });
    await t.mutation(internal.standings.replace, {
      teamId,
      sourceId: cup,
      competitionName: "Puchar Polski",
      season: "2026/2027",
      rows: [{ ...row, name: "Champion Warszawa", isRks: false }],
    });

    const table = await t.query(api.standings.byTeam, { teamId });
    expect(table!.competitionName).toBe("Liga okręgowa");
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
