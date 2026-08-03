import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";
import { slugify } from "./slugify";

export const latest = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const galleries = await ctx.db
      .query("galleries")
      .withIndex("by_date")
      .order("desc")
      .take(limit || 12);

    return await Promise.all(
      galleries.map(async (gallery) => ({
        ...gallery,
        imageUrls: await Promise.all(
          gallery.imageIds.map((id) => ctx.storage.getUrl(id)),
        ),
      })),
    );
  },
});

export const adminList = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const galleries = await ctx.db
      .query("galleries")
      .withIndex("by_date")
      .order("desc")
      .collect();
    return await Promise.all(
      galleries.map(async (gallery) => ({
        ...gallery,
        imageUrls: await Promise.all(
          gallery.imageIds.map((id) => ctx.storage.getUrl(id)),
        ),
      })),
    );
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    date: v.number(),
    description: v.optional(v.string()),
    teamId: v.optional(v.id("teams")),
    imageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!args.title.trim()) throw new Error("Podaj tytuł galerii");
    if (!args.imageIds.length) throw new Error("Dodaj przynajmniej jedno zdjęcie");
    const base = slugify(args.title) || "galeria";
    let slug = base;
    let counter = 2;
    while (
      await ctx.db
        .query("galleries")
        .filter((q) => q.eq(q.field("slug"), slug))
        .first()
    ) {
      slug = `${base}-${counter}`;
      counter += 1;
    }
    return await ctx.db.insert("galleries", { ...args, slug });
  },
});

export const update = mutation({
  args: {
    id: v.id("galleries"),
    title: v.optional(v.string()),
    date: v.optional(v.number()),
    description: v.optional(v.union(v.string(), v.null())),
    teamId: v.optional(v.union(v.id("teams"), v.null())),
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    const gallery = await ctx.db.get(id);
    if (!gallery) throw new Error("Nie znaleziono galerii");

    const patch: Record<string, unknown> = Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [
        key,
        value === null ? undefined : value,
      ]),
    );

    await ctx.db.patch(id, patch);
  },
});

export const addImages = mutation({
  args: { id: v.id("galleries"), imageIds: v.array(v.id("_storage")) },
  handler: async (ctx, { id, imageIds }) => {
    await requireAdmin(ctx);
    const gallery = await ctx.db.get(id);
    if (!gallery) throw new Error("Nie znaleziono galerii");
    await ctx.db.patch(id, { imageIds: [...gallery.imageIds, ...imageIds] });
  },
});

export const removeImage = mutation({
  args: { id: v.id("galleries"), imageId: v.id("_storage") },
  handler: async (ctx, { id, imageId }) => {
    await requireAdmin(ctx);
    const gallery = await ctx.db.get(id);
    if (!gallery) throw new Error("Nie znaleziono galerii");
    await ctx.storage.delete(imageId);
    await ctx.db.patch(id, {
      imageIds: gallery.imageIds.filter((item) => item !== imageId),
    });
  },
});

export const removeGallery = mutation({
  args: { id: v.id("galleries") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const gallery = await ctx.db.get(id);
    if (!gallery) return;
    for (const imageId of gallery.imageIds) {
      await ctx.storage.delete(imageId);
    }
    await ctx.db.delete(id);
  },
});
