import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

const admin = { subject: "admin|1", email: "admin@rksokecie.pl" };

async function seedTeam(t: ReturnType<typeof convexTest>, slug = "rocznik-2015") {
  return await t.run(async (ctx) =>
    await ctx.db.insert("teams", {
      name: `Drużyna ${slug}`,
      slug,
      isActive: true,
      sortOrder: 0,
    }),
  );
}

describe("teams.removeTeam - kaskada", () => {
  it("usuwa zawodników z ich zdjęciami, źródła, standings i mecze ręczne", async () => {
    const t = convexTest(schema, modules);
    const teamId = await seedTeam(t);
    const asAdmin = t.withIdentity(admin);

    const photoId = await t.run(async (ctx) =>
      await ctx.storage.store(new Blob(["x"], { type: "image/webp" })),
    );

    const { sourceId, standingId, manualMatchId, syncMatchId } = await t.run(
      async (ctx) => {
        await ctx.db.insert("players", {
          name: "Jan Kowalski",
          teamId,
          photoStorageId: photoId,
          sortOrder: 1,
        });
        const sourceId = await ctx.db.insert("syncSources", {
          teamId,
          kind: "ninetyminut",
          url: "http://x",
          externalId: "1",
          teamNameOnSource: "X",
          matchType: "liga",
          enabled: true,
        });
        const standingId = await ctx.db.insert("standings", {
          teamId,
          sourceId,
          competitionName: "Liga",
          season: "2026/27",
          rows: [],
          syncedAt: 1,
        });
        const manualMatchId = await ctx.db.insert("matches", {
          homeTeam: "A",
          awayTeam: "B",
          date: 1,
          matchType: "liga",
          status: "upcoming",
          source: "manual",
          teamId,
        });
        const syncMatchId = await ctx.db.insert("matches", {
          homeTeam: "C",
          awayTeam: "D",
          date: 1,
          matchType: "liga",
          status: "upcoming",
          source: "ninetyminut",
          sourceMatchId: "s1",
          teamId,
        });
        return { sourceId, standingId, manualMatchId, syncMatchId };
      },
    );

    await asAdmin.mutation(api.teams.removeTeam, { id: teamId });

    await t.run(async (ctx) => {
      expect(await ctx.db.get(teamId)).toBeNull();
      expect(await ctx.db.query("players").collect()).toHaveLength(0);
      expect(await ctx.db.get(sourceId)).toBeNull();
      expect(await ctx.db.get(standingId)).toBeNull();
      // Mecz ręczny skasowany, zsynchronizowany odpięty (teamId wyczyszczony).
      expect(await ctx.db.get(manualMatchId)).toBeNull();
      const sync = await ctx.db.get(syncMatchId);
      expect(sync?.teamId).toBeUndefined();
      // Zdjęcie dziecka usunięte ze storage.
      expect(await ctx.storage.getUrl(photoId)).toBeNull();
    });
  });
});

describe("syncSources.remove - kaskada standings", () => {
  it("usuwa tabelę ligową powiązaną ze źródłem", async () => {
    const t = convexTest(schema, modules);
    const teamId = await seedTeam(t);

    const { sourceId, standingId } = await t.run(async (ctx) => {
      const sourceId = await ctx.db.insert("syncSources", {
        teamId,
        kind: "virium",
        url: "http://x",
        externalId: "2",
        teamNameOnSource: "X",
        matchType: "liga",
        enabled: true,
      });
      const standingId = await ctx.db.insert("standings", {
        teamId,
        sourceId,
        competitionName: "Liga",
        season: "2026/27",
        rows: [],
        syncedAt: 1,
      });
      return { sourceId, standingId };
    });

    await t.withIdentity(admin).mutation(api.syncSources.remove, { sourceId });

    await t.run(async (ctx) => {
      expect(await ctx.db.get(sourceId)).toBeNull();
      expect(await ctx.db.get(standingId)).toBeNull();
    });
  });
});

describe("matches - ręczne pola odporne na sync", () => {
  it("sync nie nadpisuje ręcznie wpisanego wyniku ani statusu", async () => {
    const t = convexTest(schema, modules);
    const teamId = await seedTeam(t);
    const asAdmin = t.withIdentity(admin);

    const matchId = await t.run(async (ctx) =>
      await ctx.db.insert("matches", {
        homeTeam: "Okęcie",
        awayTeam: "Rywal",
        date: 1000,
        matchType: "liga",
        status: "upcoming",
        source: "ninetyminut",
        sourceMatchId: "m1",
        teamId,
      }),
    );

    // Admin wpisuje wynik i zamyka mecz.
    await asAdmin.mutation(api.matches.update, {
      id: matchId,
      result: "2:1",
      status: "finished",
    });

    // Kolejny sync ze źródła (jeszcze bez wyniku) próbuje nadpisać.
    await t.mutation(internal.matches.upsertFromSource, {
      source: "ninetyminut",
      sourceMatchId: "m1",
      homeTeam: "Okęcie",
      awayTeam: "Rywal",
      date: 1000,
      matchType: "liga",
      status: "upcoming",
      teamId,
    });

    await t.run(async (ctx) => {
      const match = await ctx.db.get(matchId);
      expect(match?.result).toBe("2:1");
      expect(match?.status).toBe("finished");
    });
  });

  it("sync nadal aktualizuje pola nietknięte ręcznie", async () => {
    const t = convexTest(schema, modules);
    const teamId = await seedTeam(t);
    const asAdmin = t.withIdentity(admin);

    const matchId = await t.run(async (ctx) =>
      await ctx.db.insert("matches", {
        homeTeam: "Okęcie",
        awayTeam: "Rywal",
        date: 1000,
        venue: "Stare boisko",
        matchType: "liga",
        status: "upcoming",
        source: "ninetyminut",
        sourceMatchId: "m2",
        teamId,
      }),
    );

    // Admin poprawia tylko wynik.
    await asAdmin.mutation(api.matches.update, { id: matchId, result: "1:0" });

    // Sync przynosi nowe miejsce i wynik.
    await t.mutation(internal.matches.upsertFromSource, {
      source: "ninetyminut",
      sourceMatchId: "m2",
      homeTeam: "Okęcie",
      awayTeam: "Rywal",
      date: 1000,
      venue: "Nowy stadion",
      result: "3:3",
      matchType: "liga",
      status: "finished",
      teamId,
    });

    await t.run(async (ctx) => {
      const match = await ctx.db.get(matchId);
      expect(match?.result).toBe("1:0"); // ręczne - chronione
      expect(match?.venue).toBe("Nowy stadion"); // ze źródła - zaktualizowane
    });
  });
});
