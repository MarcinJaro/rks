import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";

export const list = query({
  handler: async (ctx) => {
    const documents = await ctx.db.query("documents").collect();

    return await Promise.all(
      documents
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(async (document) => ({
          ...document,
          fileUrl: await ctx.storage.getUrl(document.fileStorageId),
        })),
    );
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    category: v.string(),
    fileStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!args.title.trim()) throw new Error("Podaj tytuł dokumentu");
    const all = await ctx.db.query("documents").collect();
    const sortOrder =
      all.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1;
    return await ctx.db.insert("documents", { ...args, sortOrder });
  },
});

export const update = mutation({
  args: {
    id: v.id("documents"),
    title: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    const document = await ctx.db.get(id);
    if (!document) throw new Error("Nie znaleziono dokumentu");
    await ctx.db.patch(id, fields);
  },
});

export const removeDocument = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const document = await ctx.db.get(id);
    if (!document) return;
    await ctx.storage.delete(document.fileStorageId);
    await ctx.db.delete(id);
  },
});
