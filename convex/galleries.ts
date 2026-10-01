import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";
import { slugify } from "./slugify";

/** Galeria do strony publicznej: adresy zdjęć i drużyna, bez pustych plików. */
async function publicGallery(ctx: QueryCtx, gallery: Doc<"galleries">) {
  const team = gallery.teamId ? await ctx.db.get(gallery.teamId) : null;
  const imageUrls = await Promise.all(
    gallery.imageIds.map((id) => ctx.storage.getUrl(id)),
  );
  return {
    _id: gallery._id,
    title: gallery.title.trim(),
    slug: gallery.slug,
    date: gallery.date,
    description: gallery.description?.trim() || null,
    team: team ? { slug: team.slug, name: team.name } : null,
    imageUrls: imageUrls.filter((url): url is string => url !== null),
  };
}

export const latest = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const galleries = await ctx.db
      .query("galleries")
      .withIndex("by_date")
      .order("desc")
      .take(Math.min(limit || 12, 50));

    return await Promise.all(
      galleries.map((gallery) => publicGallery(ctx, gallery)),
    );
  },
});

/** Galerie przypisane w panelu do drużyny - pokazywane na jej stronie. */
export const listByTeamSlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const team = await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!team) return [];
    const galleries = await ctx.db
      .query("galleries")
      .withIndex("by_team", (q) => q.eq("teamId", team._id))
      .take(50);
    galleries.sort((a, b) => b.date - a.date);
    return await Promise.all(
      galleries.map((gallery) => publicGallery(ctx, gallery)),
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
        .withIndex("by_slug", (q) => q.eq("slug", slug))
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
