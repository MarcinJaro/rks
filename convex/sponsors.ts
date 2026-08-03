import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";

export const listByType = query({
  args: { type: v.union(v.literal("sponsor"), v.literal("partner")) },
  handler: async (ctx, { type }) => {
    const sponsors = await ctx.db
      .query("sponsors")
      .withIndex("by_type", (q) => q.eq("type", type))
      .order("asc")
      .collect();

    return await Promise.all(
      sponsors.map(async (sponsor) => ({
        ...sponsor,
        logoUrl: await ctx.storage.getUrl(sponsor.logoStorageId),
      })),
    );
  },
});

const sponsorType = v.union(v.literal("sponsor"), v.literal("partner"));

export const adminList = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const sponsors = await ctx.db.query("sponsors").collect();
    sponsors.sort(
      (a, b) => a.type.localeCompare(b.type) || a.sortOrder - b.sortOrder,
    );
    return await Promise.all(
      sponsors.map(async (sponsor) => ({
        ...sponsor,
        logoUrl: await ctx.storage.getUrl(sponsor.logoStorageId),
      })),
    );
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    logoStorageId: v.id("_storage"),
    url: v.optional(v.string()),
    type: sponsorType,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!args.name.trim()) throw new Error("Podaj nazwę sponsora");
    const sameType = await ctx.db
      .query("sponsors")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .collect();
    const sortOrder =
      sameType.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1;
    return await ctx.db.insert("sponsors", { ...args, sortOrder });
  },
});

export const update = mutation({
  args: {
    id: v.id("sponsors"),
    name: v.optional(v.string()),
    logoStorageId: v.optional(v.id("_storage")),
    url: v.optional(v.union(v.string(), v.null())),
    type: v.optional(sponsorType),
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    const sponsor = await ctx.db.get(id);
    if (!sponsor) throw new Error("Nie znaleziono sponsora");
    if (fields.logoStorageId && fields.logoStorageId !== sponsor.logoStorageId) {
      await ctx.storage.delete(sponsor.logoStorageId);
    }

    const patch: Record<string, unknown> = Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [
        key,
        value === null ? undefined : value,
      ]),
    );

    await ctx.db.patch(id, patch);
  },
});

export const removeSponsor = mutation({
  args: { id: v.id("sponsors") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const sponsor = await ctx.db.get(id);
    if (!sponsor) return;
    await ctx.storage.delete(sponsor.logoStorageId);
    await ctx.db.delete(id);
  },
});

export const reorder = mutation({
  args: {
    id: v.id("sponsors"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, { id, direction }) => {
    await requireAdmin(ctx);
    const sponsor = await ctx.db.get(id);
    if (!sponsor) throw new Error("Nie znaleziono sponsora");
    const sameType = await ctx.db
      .query("sponsors")
      .withIndex("by_type", (q) => q.eq("type", sponsor.type))
      .order("asc")
      .collect();
    const index = sameType.findIndex((item) => item._id === id);
    const neighbor = sameType[direction === "up" ? index - 1 : index + 1];
    if (!neighbor) return;
    await ctx.db.patch(sponsor._id, { sortOrder: neighbor.sortOrder });
    await ctx.db.patch(neighbor._id, { sortOrder: sponsor.sortOrder });
  },
});
