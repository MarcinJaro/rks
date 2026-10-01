import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

async function seed() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const photo = await ctx.storage.store(new Blob(["p"], { type: "image/jpeg" }));
    const shot = await ctx.storage.store(new Blob(["s"], { type: "image/jpeg" }));
    const seniors = await ctx.db.insert("teams", {
      name: "Seniorzy - Liga okręgowa",
      slug: "seniorzy",
      isActive: true,
      sortOrder: 1,
      groupPhotoId: photo,
    });
    const reserves = await ctx.db.insert("teams", {
      name: "Seniorzy II - B Klasa",
      slug: "seniorzy2",
      isActive: true,
      sortOrder: 2,
    });
    await ctx.db.insert("galleries", {
      title: "Kadra 1 zespołu seniorów ",
      slug: "kadra",
      imageIds: [shot],
      teamId: seniors,
      date: 2,
      description: "  Górny rząd: A  ",
    });
    await ctx.db.insert("galleries", {
      title: "Starsza",
      slug: "starsza",
      imageIds: [shot],
      teamId: seniors,
      date: 1,
    });
    await ctx.db.insert("people", {
      name: "ARTUR  SYBIS-KAŁUSKI",
      role: "trener",
      position: "Kierownik 2 zespołu seniorów",
      teamId: reserves,
      photoStorageId: photo,
      sortOrder: 1,
    });
    await ctx.db.insert("people", {
      name: "Jan Zarząd",
      role: "zarząd",
      sortOrder: 2,
    });
    return { seniors, reserves };
  });
  return { t, ...ids };
}

describe("public team media", () => {
  it("serves the panel group photo by team slug", async () => {
    const { t } = await seed();
    expect(
      await t.query(api.teams.groupPhotoBySlug, { slug: "seniorzy" }),
    ).toMatch(/^https?:\/\//);
    expect(
      await t.query(api.teams.groupPhotoBySlug, { slug: "seniorzy2" }),
    ).toBeNull();
    expect(
      await t.query(api.teams.groupPhotoBySlug, { slug: "brak" }),
    ).toBeNull();
  });

  it("lists a team's galleries newest first with trimmed text", async () => {
    const { t } = await seed();
    const galleries = await t.query(api.galleries.listByTeamSlug, {
      slug: "seniorzy",
    });
    expect(galleries.map((gallery) => gallery.title)).toEqual([
      "Kadra 1 zespołu seniorów",
      "Starsza",
    ]);
    expect(galleries[0]).toMatchObject({
      description: "Górny rząd: A",
      team: { slug: "seniorzy", name: "Seniorzy - Liga okręgowa" },
    });
    expect(galleries[0].imageUrls).toHaveLength(1);
    expect(
      await t.query(api.galleries.listByTeamSlug, { slug: "seniorzy2" }),
    ).toEqual([]);
  });

  it("lists trainers with their team for the public site", async () => {
    const { t } = await seed();
    const trainers = await t.query(api.people.listTrainersPublic, {});
    expect(trainers).toHaveLength(1);
    expect(trainers[0]).toMatchObject({
      name: "ARTUR  SYBIS-KAŁUSKI",
      position: "Kierownik 2 zespołu seniorów",
      teamSlug: "seniorzy2",
      teamName: "Seniorzy II - B Klasa",
    });
    expect(trainers[0].photoUrl).toMatch(/^https?:\/\//);
  });
});
