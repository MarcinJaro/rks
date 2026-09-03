import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

const admin = { subject: "admin|workspace", email: "admin@rksokecie.pl" };
const now = 1_800_000_000_000;

async function seedWorkspace(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const teamId = await ctx.db.insert("teams", {
      name: "Rocznik 2012",
      slug: "rocznik-2012",
      isActive: true,
      sortOrder: 1,
    });
    const coachId = await ctx.db.insert("people", {
      name: "Trener Pierwszy",
      role: "trener",
      teamId,
      sortOrder: 1,
    });
    await ctx.db.insert("people", {
      name: "Trener Drugi",
      role: "trener",
      teamId,
      sortOrder: 2,
    });
    await ctx.db.insert("people", {
      name: "Członek zarządu",
      role: "zarząd",
      sortOrder: 1,
    });
    await ctx.db.insert("players", {
      name: "Zawodnik Testowy",
      teamId,
      sortOrder: 1,
    });
    const articleId = await ctx.db.insert("articles", {
      title: "Szkic testowy",
      slug: "szkic-testowy",
      content: "Treść",
      contentHtml: "<p>Treść</p>",
      status: "draft",
    });

    await ctx.db.insert("matches", {
      homeTeam: "Stary mecz",
      awayTeam: "Rywal",
      date: now - 7 * 60 * 60 * 1000,
      dateConfirmed: false,
      matchType: "liga",
      status: "upcoming",
      teamId,
    });

    await ctx.db.patch(teamId, { coachId });
    const firstUpcomingId = await ctx.db.insert("matches", {
      homeTeam: "Bez przypisania",
      awayTeam: "Rywal A",
      date: now + 60 * 60 * 1000,
      dateConfirmed: false,
      matchType: "liga",
      status: "upcoming",
    });
    const secondUpcomingId = await ctx.db.insert("matches", {
      homeTeam: "Rocznik 2012",
      awayTeam: "Rywal B",
      date: now + 2 * 60 * 60 * 1000,
      matchType: "liga",
      status: "upcoming",
      teamId,
      articleId,
    });
    const matchEventId = await ctx.db.insert("matchEvents", {
      matchId: secondUpcomingId,
      playerName: "Strzelec",
      type: "goal",
      minute: 12,
    });

    const sourceId = await ctx.db.insert("syncSources", {
      teamId,
      kind: "ninetyminut",
      url: "https://example.com/liga",
      externalId: "liga-1",
      teamNameOnSource: "Rocznik 2012",
      matchType: "liga",
      enabled: true,
    });
    const standingId = await ctx.db.insert("standings", {
      teamId,
      sourceId,
      competitionName: "Liga testowa",
      season: "2026/2027",
      rows: [],
      syncedAt: now,
    });

    return {
      articleId,
      coachId,
      firstUpcomingId,
      matchEventId,
      secondUpcomingId,
      sourceId,
      standingId,
      teamId,
    };
  });
}

describe("admin dashboard", () => {
  it("zwraca czytelny status lekkiej bramki dostępu", async () => {
    const t = convexTest(schema, modules);

    await expect(t.query(api.adminAccess.status, {})).resolves.toEqual({
      status: "unauthenticated",
    });
    await expect(
      t.withIdentity({ email: "obcy@example.com" }).query(api.adminAccess.status, {}),
    ).resolves.toEqual({ status: "forbidden" });
    await expect(
      t.withIdentity(admin).query(api.adminAccess.status, {}),
    ).resolves.toEqual({ status: "authorized" });
  });

  it("odrzuca niezalogowane i nieuprawnione konta", async () => {
    const t = convexTest(schema, modules);

    await expect(t.query(api.adminDashboard.overview, { now })).rejects.toThrow(
      /autoryzacji/i,
    );
    await expect(
      t
        .withIdentity({ email: "obcy@example.com" })
        .query(api.adminDashboard.overview, { now }),
    ).rejects.toThrow(/uprawnień/i);
  });

  it("liczy dane, odcina stare terminy i pokazuje realnych trenerów", async () => {
    const t = convexTest(schema, modules);
    const seeded = await seedWorkspace(t);
    const asAdmin = t.withIdentity(admin);

    const overview = await asAdmin.query(api.adminDashboard.overview, { now });

    expect(overview.counts.teams).toBe(1);
    expect(overview.counts.people).toBe(3);
    expect(overview.counts.standings).toBe(1);
    expect(overview.metrics.content).toBe(1);
    expect(overview.metrics.coaches).toBe(2);
    expect(overview.metrics.upcomingMatches).toBe(2);
    expect(overview.metrics.upcomingMatchesCapped).toBe(false);
    expect(overview.metrics.unassignedMatches).toBe(1);
    expect(overview.upcoming.map((match) => match.id)).toEqual([
      seeded.firstUpcomingId,
      seeded.secondUpcomingId,
    ]);
    expect(overview.attention.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        "unconfirmed-matches",
        "unassigned-matches",
        "drafts",
      ]),
    );

    const teams = await asAdmin.query(api.teams.adminList, {});
    expect(teams[0].coaches.map((coach) => coach.name)).toEqual([
      "Trener Pierwszy",
      "Trener Drugi",
    ]);
    expect(teams[0].playerCount).toBe(1);
  });

  it("nie wlicza rekordu-sentinela do KPI przy przekroczeniu limitu 200", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      for (let index = 0; index < 201; index += 1) {
        await ctx.db.insert("teams", {
          name: `Drużyna ${index}`,
          slug: `druzyna-${index}`,
          isActive: true,
          sortOrder: index,
        });
      }
    });

    const overview = await t.withIdentity(admin).query(api.adminDashboard.overview, { now });

    expect(overview.counts.teams).toBe(200);
    expect(overview.cappedTables).toContain("teams");
    expect(overview.metrics.activeTeams).toBe(200);
  });
});

describe("admin data explorer", () => {
  it("wymaga uprawnień administratora", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.query(api.adminData.listTable, {
        table: "standings",
        paginationOpts: { cursor: null, numItems: 25 },
      }),
    ).rejects.toThrow(/autoryzacji/i);
    await expect(
      t.withIdentity({ email: "obcy@example.com" }).query(
        api.adminData.listTable,
        {
          table: "standings",
          paginationOpts: { cursor: null, numItems: 25 },
        },
      ),
    ).rejects.toThrow(/uprawnień/i);
  });

  it("paginuje kompletny rekord tabeli ligowej", async () => {
    const t = convexTest(schema, modules);
    const seeded = await seedWorkspace(t);

    const result = await t.withIdentity(admin).query(api.adminData.listTable, {
      table: "standings",
      paginationOpts: { cursor: null, numItems: 25 },
    });

    expect(result.isDone).toBe(true);
    expect(result.page).toHaveLength(1);
    expect(result.page[0]).toMatchObject({
      _id: seeded.standingId,
      competitionName: "Liga testowa",
      season: "2026/2027",
      rows: [],
      teamId: seeded.teamId,
      sourceId: seeded.sourceId,
      __adminRelations: {
        teamId: "Rocznik 2012",
        sourceId: "Rocznik 2012 · 90minut.pl",
      },
    });
  });

  it("wzbogaca FK z bieżącej strony o czytelne etykiety", async () => {
    const t = convexTest(schema, modules);
    const seeded = await seedWorkspace(t);
    const asAdmin = t.withIdentity(admin);
    const paginationOpts = { cursor: null, numItems: 25 } as const;

    const [teams, matches, events] = await Promise.all([
      asAdmin.query(api.adminData.listTable, {
        table: "teams",
        paginationOpts,
      }),
      asAdmin.query(api.adminData.listTable, {
        table: "matches",
        paginationOpts,
      }),
      asAdmin.query(api.adminData.listTable, {
        table: "matchEvents",
        paginationOpts,
      }),
    ]);

    expect(teams.page[0]).toMatchObject({
      _id: seeded.teamId,
      coachId: seeded.coachId,
      __adminRelations: { coachId: "Trener Pierwszy" },
    });

    const relatedMatch = matches.page.find(
      (match) => match._id === seeded.secondUpcomingId,
    );
    expect(relatedMatch).toMatchObject({
      teamId: seeded.teamId,
      articleId: seeded.articleId,
      __adminRelations: {
        teamId: "Rocznik 2012",
        articleId: "Szkic testowy",
      },
    });

    expect(events.page[0]).toMatchObject({
      _id: seeded.matchEventId,
      matchId: seeded.secondUpcomingId,
      __adminRelations: { matchId: "Rocznik 2012 vs Rywal B" },
    });
  });

  it("udostępnia metadane i podpisany adres pliku storage", async () => {
    const t = convexTest(schema, modules);
    const storageId = await t.run(async (ctx) =>
      await ctx.storage.store(new Blob(["plik"], { type: "text/plain" })),
    );

    const result = await t.withIdentity(admin).query(api.adminData.listTable, {
      table: "storage",
      paginationOpts: { cursor: null, numItems: 25 },
    });

    expect(result.page).toHaveLength(1);
    expect(result.page[0]).toMatchObject({
      _id: storageId,
      size: 4,
    });
    const file = result.page[0];
    expect("url" in file && typeof file.url === "string").toBe(true);
  });
});
