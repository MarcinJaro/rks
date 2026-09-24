import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";
import type { Id } from "./_generated/dataModel";

export const listByRole = query({
  args: {
    role: v.union(
      v.literal("trener"),
      v.literal("zarząd"),
      v.literal("legenda"),
      v.literal("zasłużony"),
    ),
  },
  handler: async (ctx, { role }) => {
    return await ctx.db
      .query("people")
      .withIndex("by_role", (q) => q.eq("role", role))
      .order("asc")
      .collect();
  },
});

/**
 * Zdjęcia trenerów wgrane w panelu. Skład sztabu na stronie nadal pochodzi
 * ze statycznej listy (z telefonami i przypisaniami) - stąd bierzemy tylko
 * zdjęcie, dopasowane po imieniu i nazwisku.
 */
export const listTrainerPhotos = query({
  args: {},
  handler: async (ctx) => {
    const trainers = await ctx.db
      .query("people")
      .withIndex("by_role", (q) => q.eq("role", "trener"))
      .take(500);
    const withPhotos = await Promise.all(
      trainers.map(async (person) => ({
        name: person.name,
        photoUrl: person.photoStorageId
          ? await ctx.storage.getUrl(person.photoStorageId)
          : null,
      })),
    );
    return withPhotos.filter(
      (person): person is { name: string; photoUrl: string } =>
        person.photoUrl !== null,
    );
  },
});

const personRole = v.union(
  v.literal("trener"),
  v.literal("zarząd"),
  v.literal("legenda"),
  v.literal("zasłużony"),
);

export const adminList = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const people = await ctx.db.query("people").collect();
    people.sort(
      (a, b) => a.role.localeCompare(b.role) || a.sortOrder - b.sortOrder,
    );
    return await Promise.all(
      people.map(async (person) => ({
        ...person,
        photoUrl: person.photoStorageId
          ? await ctx.storage.getUrl(person.photoStorageId)
          : null,
      })),
    );
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    role: personRole,
    position: v.optional(v.string()),
    teamId: v.optional(v.id("teams")),
    qualifications: v.optional(v.string()),
    bio: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!args.name.trim()) throw new Error("Podaj imię i nazwisko");
    const sameRole = await ctx.db
      .query("people")
      .withIndex("by_role", (q) => q.eq("role", args.role))
      .collect();
    const sortOrder =
      sameRole.reduce((max, person) => Math.max(max, person.sortOrder), 0) + 1;
    return await ctx.db.insert("people", { ...args, sortOrder });
  },
});

export const update = mutation({
  args: {
    id: v.id("people"),
    name: v.optional(v.string()),
    role: v.optional(personRole),
    position: v.optional(v.union(v.string(), v.null())),
    teamId: v.optional(v.union(v.id("teams"), v.null())),
    qualifications: v.optional(v.union(v.string(), v.null())),
    bio: v.optional(v.union(v.string(), v.null())),
    photoStorageId: v.optional(v.union(v.id("_storage"), v.null())),
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    const person = await ctx.db.get(id);
    if (!person) throw new Error("Nie znaleziono osoby");
    if (fields.photoStorageId === null && person.photoStorageId) {
      await ctx.storage.delete(person.photoStorageId);
    } else if (
      fields.photoStorageId &&
      person.photoStorageId &&
      fields.photoStorageId !== person.photoStorageId
    ) {
      await ctx.storage.delete(person.photoStorageId);
    }

    const patch: Record<string, unknown> = Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [
        key,
        value === null ? undefined : value,
      ]),
    );

    if (fields.role && fields.role !== person.role) {
      const sameRole = await ctx.db
        .query("people")
        .withIndex("by_role", (q) => q.eq("role", fields.role!))
        .collect();
      const sortOrder =
        sameRole.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1;
      patch.sortOrder = sortOrder;
    }

    await ctx.db.patch(id, patch);
  },
});

export const removePerson = mutation({
  args: { id: v.id("people") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const person = await ctx.db.get(id);
    if (!person) return;
    const teams = await ctx.db.query("teams").collect();
    for (const team of teams) {
      if (team.coachId === id) {
        await ctx.db.patch(team._id, { coachId: undefined });
      }
    }
    if (person.photoStorageId) await ctx.storage.delete(person.photoStorageId);
    await ctx.db.delete(id);
  },
});

export const reorder = mutation({
  args: {
    id: v.id("people"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, { id, direction }) => {
    await requireAdmin(ctx);
    const person = await ctx.db.get(id);
    if (!person) throw new Error("Nie znaleziono osoby");
    const sameRole = await ctx.db
      .query("people")
      .withIndex("by_role", (q) => q.eq("role", person.role))
      .order("asc")
      .collect();
    const index = sameRole.findIndex((item) => item._id === id);
    const neighbor = sameRole[direction === "up" ? index - 1 : index + 1];
    if (!neighbor) return;
    await ctx.db.patch(person._id, { sortOrder: neighbor.sortOrder });
    await ctx.db.patch(neighbor._id, { sortOrder: person.sortOrder });
  },
});

/**
 * Dopisuje trenerów ze strony, których brakuje w panelu. Istniejących
 * rekordów (dopasowanych po imieniu i nazwisku) nie rusza.
 */
export const addMissingTrainers = internalMutation({
  args: {
    trainers: v.array(
      v.object({
        name: v.string(),
        position: v.string(),
        teamSlug: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { trainers }) => {
    const existing = await ctx.db
      .query("people")
      .withIndex("by_role", (q) => q.eq("role", "trener"))
      .collect();
    const nameKey = (name: string) =>
      name.toLocaleLowerCase("pl").split(/\s+/).filter(Boolean).sort().join(" ");
    const known = new Set(existing.map((person) => nameKey(person.name)));
    let sortOrder = existing.reduce(
      (max, person) => Math.max(max, person.sortOrder),
      0,
    );
    const added: string[] = [];
    for (const trainer of trainers) {
      if (known.has(nameKey(trainer.name))) continue;
      const team = trainer.teamSlug
        ? await ctx.db
            .query("teams")
            .withIndex("by_slug", (q) => q.eq("slug", trainer.teamSlug!))
            .first()
        : null;
      sortOrder += 1;
      await ctx.db.insert("people", {
        name: trainer.name,
        role: "trener",
        position: trainer.position,
        teamId: team?._id,
        sortOrder,
      });
      known.add(nameKey(trainer.name));
      added.push(trainer.name);
    }
    return added;
  },
});

function trainerNameKey(name: string) {
  return name.toLocaleLowerCase("pl").split(/\s+/).filter(Boolean).sort().join(" ");
}

export const trainersWithoutPhoto = internalQuery({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const trainers = await ctx.db
      .query("people")
      .withIndex("by_role", (q) => q.eq("role", "trener"))
      .collect();
    return trainers
      .filter(
        (person) =>
          !person.photoStorageId &&
          trainerNameKey(person.name) === trainerNameKey(name),
      )
      .map((person) => person._id);
  },
});

export const setPhotoIfMissing = internalMutation({
  args: { id: v.id("people"), storageId: v.id("_storage") },
  handler: async (ctx, { id, storageId }) => {
    const person = await ctx.db.get(id);
    if (!person || person.photoStorageId) {
      await ctx.storage.delete(storageId);
      return false;
    }
    await ctx.db.patch(id, { photoStorageId: storageId });
    return true;
  },
});

/**
 * Przenosi do panelu zdjęcia trenerów, które strona miała dotąd tylko jako
 * pliki w repozytorium. Każdy wpis dostaje własną kopię pliku, bo podmiana
 * zdjęcia w panelu kasuje poprzedni plik.
 */
export const importTrainerPhotos = internalAction({
  args: { items: v.array(v.object({ name: v.string(), url: v.string() })) },
  handler: async (ctx, { items }) => {
    const report: string[] = [];
    for (const { name, url } of items) {
      const ids: Id<"people">[] = await ctx.runQuery(
        internal.people.trainersWithoutPhoto,
        { name },
      );
      for (const id of ids) {
        const response = await fetch(url);
        if (!response.ok) {
          report.push(`${name}: błąd ${response.status}`);
          continue;
        }
        const storageId = await ctx.storage.store(await response.blob());
        const saved: boolean = await ctx.runMutation(
          internal.people.setPhotoIfMissing,
          { id, storageId },
        );
        report.push(`${name}: ${saved ? "dodano" : "pominięto"}`);
      }
    }
    return report;
  },
});
