import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";

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
    position: v.optional(v.string()),
    teamId: v.optional(v.id("teams")),
    qualifications: v.optional(v.string()),
    bio: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    const person = await ctx.db.get(id);
    if (!person) throw new Error("Nie znaleziono osoby");
    if (
      fields.photoStorageId &&
      person.photoStorageId &&
      fields.photoStorageId !== person.photoStorageId
    ) {
      await ctx.storage.delete(person.photoStorageId);
    }
    await ctx.db.patch(id, fields);
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
