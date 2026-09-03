import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api, internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

const seniorNames = [
  "Moatasem Aziz",
  "Krzysztof Bujak",
  "Krzysztof Capar",
  "Dominik Dedek",
  "Michał Dziubek",
  "Hubert Ihnatowicz",
  "Fabian Kaleta",
  "Kuba Kruszewski",
  "Maksym Leski",
  "Mateusz Łuczak",
  "Mateusz Łuczyk",
  "Bartłomiej Maciąg",
  "Konrad Miciński",
  "Yauheni Novik",
  "Paweł Olędzki",
  "Filip Przygoda",
  "Mikołaj Rałowiec",
  "Mateusz Rymarz",
  "Adam Szklanko",
  "Bartosz Szoja",
  "Szymon Ścięgosz",
  "Konstantyn Ślęzak",
  "Bartłomiej Warchoł",
  "Piotr Żuk",
];

async function seedSeniorTeam(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) =>
    await ctx.db.insert("teams", {
      name: "Seniorzy - Liga okręgowa",
      slug: "seniorzy",
      league: "Liga okręgowa",
      isActive: true,
      sortOrder: 1,
    }),
  );
}

async function uploadedPlayers(t: ReturnType<typeof convexTest>) {
  const storageIds = await t.run(async (ctx) =>
    await Promise.all(
      seniorNames.map((name) =>
        ctx.storage.store(new Blob([name], { type: "image/webp" })),
      ),
    ),
  );
  return seniorNames.map((name, index) => ({
    name,
    photoStorageId: storageIds[index],
  }));
}

describe("publicDataImport.importSeniorRoster", () => {
  it("atomowo importuje kompletną kadrę ze zdjęciami i kolejnością", async () => {
    const t = convexTest(schema, modules);
    await seedSeniorTeam(t);
    const players = await uploadedPlayers(t);

    const result = await t.mutation(internal.publicDataImport.importSeniorRoster, {
      players,
    });

    expect(result).toMatchObject({
      status: "imported",
      inserted: 24,
      removedUploads: 0,
      audit: {
        complete: true,
        existingCount: 24,
        withPhotoCount: 24,
        availablePhotoCount: 24,
        namesMatch: true,
      },
    });
    const roster = await t.query(api.players.listByTeamSlug, {
      slug: "seniorzy",
    });
    expect(roster.map((player) => player.name)).toEqual(seniorNames);
    expect(roster.every((player) => player.photoUrl)).toBe(true);
  });

  it("nie nadpisuje częściowej kadry i sprząta wszystkie nowe uploady", async () => {
    const t = convexTest(schema, modules);
    const teamId = await seedSeniorTeam(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("players", {
        name: "Istniejący zawodnik",
        teamId,
        sortOrder: 1,
      });
    });
    const players = await uploadedPlayers(t);

    const result = await t.mutation(internal.publicDataImport.importSeniorRoster, {
      players,
    });

    expect(result).toMatchObject({
      status: "conflict",
      inserted: 0,
      removedUploads: 24,
    });
    const audit = await t.query(internal.publicDataImport.seniorRosterAudit, {});
    expect(audit).toMatchObject({ complete: false, existingCount: 1 });
    await t.run(async (ctx) => {
      for (const player of players) {
        expect(await ctx.storage.getUrl(player.photoStorageId)).toBeNull();
      }
    });
  });

  it("jest idempotentny i nie tworzy drugiego kompletu", async () => {
    const t = convexTest(schema, modules);
    await seedSeniorTeam(t);
    await t.mutation(internal.publicDataImport.importSeniorRoster, {
      players: await uploadedPlayers(t),
    });
    const duplicateUploads = await uploadedPlayers(t);

    const second = await t.mutation(
      internal.publicDataImport.importSeniorRoster,
      { players: duplicateUploads },
    );

    expect(second).toMatchObject({
      status: "already_complete",
      inserted: 0,
      removedUploads: 24,
      audit: { complete: true, existingCount: 24 },
    });
    const roster = await t.query(api.players.listByTeamSlug, {
      slug: "seniorzy",
    });
    expect(roster).toHaveLength(24);
  });

  it("ponowienie identycznego payloadu nie kasuje przypiętych zdjęć", async () => {
    const t = convexTest(schema, modules);
    await seedSeniorTeam(t);
    const players = await uploadedPlayers(t);
    await t.mutation(internal.publicDataImport.importSeniorRoster, { players });

    const second = await t.mutation(
      internal.publicDataImport.importSeniorRoster,
      { players },
    );

    expect(second).toMatchObject({
      status: "already_complete",
      inserted: 0,
      removedUploads: 0,
      audit: { complete: true, availablePhotoCount: 24 },
    });
    const audit = await t.query(internal.publicDataImport.seniorRosterAudit, {});
    expect(audit).toMatchObject({ complete: true, availablePhotoCount: 24 });
  });

  it("cleanup po utracie odpowiedzi zachowuje zdjęcia już przypięte", async () => {
    const t = convexTest(schema, modules);
    await seedSeniorTeam(t);
    const players = await uploadedPlayers(t);
    await t.mutation(internal.publicDataImport.importSeniorRoster, { players });

    const cleanup = await t.mutation(
      internal.publicDataImport.discardUnreferencedPlayerUploads,
      { storageIds: players.map((player) => player.photoStorageId) },
    );

    expect(cleanup).toEqual({ removed: 0, preserved: 24 });
    const audit = await t.query(internal.publicDataImport.seniorRosterAudit, {});
    expect(audit).toMatchObject({ complete: true, availablePhotoCount: 24 });
  });

  it("cleanup zachowuje zdjęcie po przeniesieniu zawodnika do innej drużyny", async () => {
    const t = convexTest(schema, modules);
    await seedSeniorTeam(t);
    const players = await uploadedPlayers(t);
    await t.mutation(internal.publicDataImport.importSeniorRoster, { players });
    await t.run(async (ctx) => {
      const otherTeamId = await ctx.db.insert("teams", {
        name: "Seniorzy II",
        slug: "seniorzy2",
        isActive: true,
        sortOrder: 2,
      });
      const player = await ctx.db
        .query("players")
        .withIndex("by_photoStorageId", (q) =>
          q.eq("photoStorageId", players[0].photoStorageId),
        )
        .unique();
      if (!player) throw new Error("Brak zawodnika testowego");
      await ctx.db.patch(player._id, { teamId: otherTeamId });
    });

    const cleanup = await t.mutation(
      internal.publicDataImport.discardUnreferencedPlayerUploads,
      { storageIds: [players[0].photoStorageId] },
    );

    expect(cleanup).toEqual({ removed: 0, preserved: 1 });
    await t.run(async (ctx) => {
      expect(await ctx.storage.getUrl(players[0].photoStorageId)).not.toBeNull();
    });
  });
});

describe("publicDataImport.syncSafePublicDefaults", () => {
  it("uzupełnia tylko brakujące ustawienia i metadane partnerów", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("settings", {
        key: "kit_price",
        value: "wartość administratora",
      });
      await ctx.db.insert("sponsors", {
        name: "NIW",
        type: "partner",
        sortOrder: 1,
      });
      await ctx.db.insert("sponsors", {
        name: "Certyfikacja PZPN",
        type: "partner",
        sortOrder: 2,
      });
    });

    const result = await t.mutation(
      internal.publicDataImport.syncSafePublicDefaults,
      {},
    );

    expect(result).toEqual({
      insertedSettings: ["contact_email", "kit_order_email"],
      updatedSponsors: ["NIW", "Certyfikacja PZPN"],
      missingSponsors: [],
    });
    await t.run(async (ctx) => {
      const settings = await ctx.db.query("settings").collect();
      expect(settings.find((item) => item.key === "kit_price")?.value).toBe(
        "wartość administratora",
      );
      const sponsors = await ctx.db.query("sponsors").collect();
      expect(sponsors.find((item) => item.name === "NIW")?.url).toBe(
        "/klub/niw-crso",
      );
      expect(
        sponsors.find((item) => item.name === "Certyfikacja PZPN"),
      ).toMatchObject({ url: "/klub/certyfikacja-pzpn", label: "Program" });
    });
  });
});
