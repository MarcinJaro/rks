import { query } from "./_generated/server";
import { v } from "convex/values";

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
