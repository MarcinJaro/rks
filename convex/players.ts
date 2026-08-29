import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";
import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

const MAX_NAME = 120;
const MAX_NUMBER = 3;

async function withPhotoUrls(ctx: QueryCtx, players: Doc<"players">[]) {
  return await Promise.all(
    players.map(async (player) => ({
      _id: player._id,
      name: player.name,
      number: player.number,
      sortOrder: player.sortOrder,
      photoStorageId: player.photoStorageId,
      photoUrl: player.photoStorageId
        ? await ctx.storage.getUrl(player.photoStorageId)
        : null,
    })),
  );
}

/**
 * Publiczna kadra drużyny. Pusta tablica znaczy „klub nic tu nie wpisał" -
 * strona drużyny pokazuje wtedy dane zapasowe albo komunikat o kadrze
 * w przygotowaniu.
 */
export const listByTeamSlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const team = await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!team) return [];

    const players = await ctx.db
      .query("players")
      .withIndex("by_team", (q) => q.eq("teamId", team._id))
      .order("asc")
      .collect();

    return await withPhotoUrls(ctx, players);
  },
});

export const adminList = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const players = await ctx.db.query("players").collect();
    players.sort((a, b) => a.sortOrder - b.sortOrder);

    return await Promise.all(
      players.map(async (player) => ({
        ...player,
        photoUrl: player.photoStorageId
          ? await ctx.storage.getUrl(player.photoStorageId)
          : null,
      })),
    );
  },
});

function cleanName(name: string) {
  const value = name.trim().replace(/\s+/g, " ");
  if (value.length < 2) throw new Error("Podaj imię i nazwisko zawodnika");
  if (value.length > MAX_NAME) throw new Error("Imię i nazwisko jest za długie");
  return value;
}

function cleanNumber(number: string | undefined) {
  if (!number) return undefined;
  const value = number.trim();
  if (!value) return undefined;
  if (!/^\d{1,3}$/.test(value)) {
    throw new Error(`Numer zawodnika może mieć maksymalnie ${MAX_NUMBER} cyfry`);
  }
  return value;
}

export const create = mutation({
  args: {
    name: v.string(),
    number: v.optional(v.string()),
    teamId: v.id("teams"),
    photoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Nie znaleziono drużyny");

    const sameTeam = await ctx.db
      .query("players")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
    const sortOrder =
      sameTeam.reduce((max, player) => Math.max(max, player.sortOrder), 0) + 1;

    return await ctx.db.insert("players", {
      name: cleanName(args.name),
      number: cleanNumber(args.number),
      teamId: args.teamId,
      photoStorageId: args.photoStorageId,
      sortOrder,
    });
  },
});

/**
 * Import całej kadry z wklejonej listy. Klub wprowadza roczniki od zera, więc
 * wpisywanie kilkudziesięciu zawodników pojedynczo byłoby drogą przez mękę.
 * Każdy element to opcjonalny numer i imię z nazwiskiem.
 */
export const createMany = mutation({
  args: {
    teamId: v.id("teams"),
    entries: v.array(
      v.object({
        name: v.string(),
        number: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { teamId, entries }) => {
    await requireAdmin(ctx);
    const team = await ctx.db.get(teamId);
    if (!team) throw new Error("Nie znaleziono drużyny");
    if (entries.length === 0) throw new Error("Lista jest pusta");
    if (entries.length > 100) {
      throw new Error("Maksymalnie 100 zawodników na raz");
    }

    const sameTeam = await ctx.db
      .query("players")
      .withIndex("by_team", (q) => q.eq("teamId", teamId))
      .collect();
    let sortOrder = sameTeam.reduce(
      (max, player) => Math.max(max, player.sortOrder),
      0,
    );

    // Walidujemy wszystko przed pierwszym zapisem - mutacja jest transakcyjna,
    // więc jedna zła linia nie zostawi połowy kadry w bazie.
    const prepared = entries.map((entry) => ({
      name: cleanName(entry.name),
      number: cleanNumber(entry.number),
    }));

    for (const entry of prepared) {
      sortOrder += 1;
      await ctx.db.insert("players", { ...entry, teamId, sortOrder });
    }

    return prepared.length;
  },
});

export const update = mutation({
  args: {
    id: v.id("players"),
    name: v.optional(v.string()),
    number: v.optional(v.union(v.string(), v.null())),
    teamId: v.optional(v.id("teams")),
    photoStorageId: v.optional(v.union(v.id("_storage"), v.null())),
  },
  handler: async (ctx, { id, name, number, teamId, photoStorageId }) => {
    await requireAdmin(ctx);
    const player = await ctx.db.get(id);
    if (!player) throw new Error("Nie znaleziono zawodnika");

    // Zdjęcie zastąpione lub skasowane - stary plik znika ze storage, żeby
    // nie zostawiać wizerunku dziecka po usunięciu wpisu.
    if (photoStorageId === null && player.photoStorageId) {
      await ctx.storage.delete(player.photoStorageId);
    } else if (
      photoStorageId &&
      player.photoStorageId &&
      photoStorageId !== player.photoStorageId
    ) {
      await ctx.storage.delete(player.photoStorageId);
    }

    const patch: Partial<Doc<"players">> = {};
    if (name !== undefined) patch.name = cleanName(name);
    if (number !== undefined) {
      patch.number = number === null ? undefined : cleanNumber(number);
    }
    if (photoStorageId !== undefined) {
      patch.photoStorageId = photoStorageId === null ? undefined : photoStorageId;
    }
    if (teamId !== undefined && teamId !== player.teamId) {
      const team = await ctx.db.get(teamId);
      if (!team) throw new Error("Nie znaleziono drużyny");
      const sameTeam = await ctx.db
        .query("players")
        .withIndex("by_team", (q) => q.eq("teamId", teamId))
        .collect();
      patch.teamId = teamId;
      patch.sortOrder =
        sameTeam.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1;
    }

    await ctx.db.patch(id, patch);
  },
});

export const removePlayer = mutation({
  args: { id: v.id("players") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const player = await ctx.db.get(id);
    if (!player) return;
    if (player.photoStorageId) await ctx.storage.delete(player.photoStorageId);
    await ctx.db.delete(id);
  },
});

export const reorder = mutation({
  args: {
    id: v.id("players"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, { id, direction }) => {
    await requireAdmin(ctx);
    const player = await ctx.db.get(id);
    if (!player) throw new Error("Nie znaleziono zawodnika");

    const sameTeam = await ctx.db
      .query("players")
      .withIndex("by_team", (q) => q.eq("teamId", player.teamId))
      .order("asc")
      .collect();
    const index = sameTeam.findIndex((item) => item._id === id);
    const neighbor = sameTeam[direction === "up" ? index - 1 : index + 1];
    if (!neighbor) return;

    await ctx.db.patch(player._id, { sortOrder: neighbor.sortOrder });
    await ctx.db.patch(neighbor._id, { sortOrder: player.sortOrder });
  },
});
