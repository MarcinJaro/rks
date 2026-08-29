import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Sprzątanie pliku wgranego w formularzu, ale porzuconego (Anuluj / podmiana
 * przed zapisem). Wołane wyłącznie z panelu dla świeżych, niedopiętych
 * storageId - nie sprawdzamy referencji, bo admin i tak może kasować media.
 */
export const removeUpload = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    await requireAdmin(ctx);
    await ctx.storage.delete(storageId);
  },
});
