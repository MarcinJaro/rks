import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
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

describe("players.listByTeamSlug", () => {
  it("zwraca pustą kadrę dla nieznanej drużyny", async () => {
    const t = convexTest(schema, modules);

    expect(await t.query(api.players.listByTeamSlug, { slug: "brak" })).toEqual(
      [],
    );
  });

  it("zwraca zawodników w kolejności sortOrder", async () => {
    const t = convexTest(schema, modules);
    const teamId = await seedTeam(t);
    const asAdmin = t.withIdentity(admin);

    await asAdmin.mutation(api.players.create, { name: "Pierwszy", teamId });
    await asAdmin.mutation(api.players.create, {
      name: "Drugi",
      number: "10",
      teamId,
    });

    const roster = await t.query(api.players.listByTeamSlug, {
      slug: "rocznik-2015",
    });
    expect(roster.map((player) => player.name)).toEqual(["Pierwszy", "Drugi"]);
    expect(roster[1].number).toBe("10");
    expect(roster[0].photoUrl).toBeNull();
  });
});

describe("players.create", () => {
  it("wymaga zalogowania", async () => {
    const t = convexTest(schema, modules);
    const teamId = await seedTeam(t);

    await expect(
      t.mutation(api.players.create, { name: "Ktoś", teamId }),
    ).rejects.toThrow(/autoryzacji/i);
  });

  it("odrzuca numer, który nie jest liczbą", async () => {
    const t = convexTest(schema, modules);
    const teamId = await seedTeam(t);

    await expect(
      t
        .withIdentity(admin)
        .mutation(api.players.create, { name: "Jan Kowalski", number: "1A", teamId }),
    ).rejects.toThrow(/Numer/i);
  });

  it("odrzuca puste imię", async () => {
    const t = convexTest(schema, modules);
    const teamId = await seedTeam(t);

    await expect(
      t.withIdentity(admin).mutation(api.players.create, { name: " ", teamId }),
    ).rejects.toThrow(/imię i nazwisko/i);
  });
});

describe("players.createMany", () => {
  it("importuje całą listę i nadaje kolejność", async () => {
    const t = convexTest(schema, modules);
    const teamId = await seedTeam(t);

    const count = await t.withIdentity(admin).mutation(api.players.createMany, {
      teamId,
      entries: [
        { name: "Bartosz Golder", number: "1" },
        { name: "Patryk Tarkowski", number: "10" },
        { name: "Karol Nguyen" },
      ],
    });

    expect(count).toBe(3);
    const roster = await t.query(api.players.listByTeamSlug, {
      slug: "rocznik-2015",
    });
    expect(roster.map((player) => player.name)).toEqual([
      "Bartosz Golder",
      "Patryk Tarkowski",
      "Karol Nguyen",
    ]);
    expect(roster[2].number).toBeUndefined();
  });

  it("nie zapisuje niczego, gdy jedna pozycja jest błędna", async () => {
    const t = convexTest(schema, modules);
    const teamId = await seedTeam(t);

    await expect(
      t.withIdentity(admin).mutation(api.players.createMany, {
        teamId,
        entries: [{ name: "Poprawny" }, { name: "X" }],
      }),
    ).rejects.toThrow(/imię i nazwisko/i);

    expect(
      await t.query(api.players.listByTeamSlug, { slug: "rocznik-2015" }),
    ).toEqual([]);
  });

  it("odrzuca pustą listę", async () => {
    const t = convexTest(schema, modules);
    const teamId = await seedTeam(t);

    await expect(
      t
        .withIdentity(admin)
        .mutation(api.players.createMany, { teamId, entries: [] }),
    ).rejects.toThrow(/pusta/i);
  });
});

describe("players.reorder", () => {
  it("zamienia zawodnika z sąsiadem", async () => {
    const t = convexTest(schema, modules);
    const teamId = await seedTeam(t);
    const asAdmin = t.withIdentity(admin);

    await asAdmin.mutation(api.players.createMany, {
      teamId,
      entries: [{ name: "Pierwszy" }, { name: "Drugi" }],
    });
    const before = await t.query(api.players.listByTeamSlug, {
      slug: "rocznik-2015",
    });

    await asAdmin.mutation(api.players.reorder, {
      id: before[1]._id,
      direction: "up",
    });

    const after = await t.query(api.players.listByTeamSlug, {
      slug: "rocznik-2015",
    });
    expect(after.map((player) => player.name)).toEqual(["Drugi", "Pierwszy"]);
  });
});
