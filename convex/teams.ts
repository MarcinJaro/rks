import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";
import type { MutationCtx } from "./_generated/server";
import { slugify } from "./slugify";

export const list = query({
  args: { activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, { activeOnly }) => {
    const teams = await ctx.db
      .query("teams")
      .withIndex("by_sortOrder")
      .order("asc")
      .collect();

    return activeOnly ? teams.filter((team) => team.isActive) : teams;
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
  },
});

export const upsert = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    yearGroup: v.optional(v.number()),
    league: v.optional(v.string()),
    schedule: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }

    return await ctx.db.insert("teams", args);
  },
});

export const adminList = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const teams = await ctx.db
      .query("teams")
      .withIndex("by_sortOrder")
      .order("asc")
      .collect();
    return await Promise.all(
      teams.map(async (team) => ({
        ...team,
        groupPhotoUrl: team.groupPhotoId
          ? await ctx.storage.getUrl(team.groupPhotoId)
          : null,
        coach: team.coachId ? await ctx.db.get(team.coachId) : null,
      })),
    );
  },
});

async function uniqueTeamSlug(ctx: MutationCtx, name: string) {
  const base = slugify(name) || "druzyna";
  let slug = base;
  let counter = 2;
  while (
    await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first()
  ) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
}

export const create = mutation({
  args: {
    name: v.string(),
    yearGroup: v.optional(v.number()),
    league: v.optional(v.string()),
    schedule: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    groupPhotoId: v.optional(v.id("_storage")),
    coachId: v.optional(v.id("people")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!args.name.trim()) throw new Error("Podaj nazwę drużyny");
    const slug = await uniqueTeamSlug(ctx, args.name);
    const all = await ctx.db.query("teams").collect();
    const sortOrder =
      all.reduce((max, team) => Math.max(max, team.sortOrder), 0) + 1;
    return await ctx.db.insert("teams", { ...args, slug, sortOrder });
  },
});

export const update = mutation({
  args: {
    id: v.id("teams"),
    name: v.optional(v.string()),
    yearGroup: v.optional(v.union(v.number(), v.null())),
    league: v.optional(v.union(v.string(), v.null())),
    schedule: v.optional(v.union(v.string(), v.null())),
    description: v.optional(v.union(v.string(), v.null())),
    isActive: v.optional(v.boolean()),
    groupPhotoId: v.optional(v.union(v.id("_storage"), v.null())),
    coachId: v.optional(v.union(v.id("people"), v.null())),
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    const team = await ctx.db.get(id);
    if (!team) throw new Error("Nie znaleziono drużyny");
    if (fields.groupPhotoId === null && team.groupPhotoId) {
      await ctx.storage.delete(team.groupPhotoId);
    } else if (
      fields.groupPhotoId &&
      team.groupPhotoId &&
      fields.groupPhotoId !== team.groupPhotoId
    ) {
      await ctx.storage.delete(team.groupPhotoId);
    }

    const patch = Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [
        key,
        value === null ? undefined : value,
      ]),
    );

    await ctx.db.patch(id, patch);
  },
});

export const removeTeam = mutation({
  args: { id: v.id("teams") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const team = await ctx.db.get(id);
    if (!team) return;
    const members = await ctx.db
      .query("people")
      .withIndex("by_team", (q) => q.eq("teamId", id))
      .collect();
    for (const person of members) {
      await ctx.db.patch(person._id, { teamId: undefined });
    }
    if (team.groupPhotoId) await ctx.storage.delete(team.groupPhotoId);
    await ctx.db.delete(id);
  },
});

export const reorder = mutation({
  args: {
    id: v.id("teams"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, { id, direction }) => {
    await requireAdmin(ctx);
    const team = await ctx.db.get(id);
    if (!team) throw new Error("Nie znaleziono drużyny");
    const all = await ctx.db
      .query("teams")
      .withIndex("by_sortOrder")
      .order("asc")
      .collect();
    const index = all.findIndex((item) => item._id === id);
    const neighborIndex = direction === "up" ? index - 1 : index + 1;
    const neighbor = all[neighborIndex];
    if (!neighbor) return;
    await ctx.db.patch(team._id, { sortOrder: neighbor.sortOrder });
    await ctx.db.patch(neighbor._id, { sortOrder: team.sortOrder });
  },
});
