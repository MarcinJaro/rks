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
      detectSource(
        "https://web.virium.pl/rssport/teams/03ea137c-d0e4-4739-be1b-d5d95fe28977",
      ),
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
