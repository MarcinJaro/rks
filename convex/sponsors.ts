import { query } from "./_generated/server";
import { v } from "convex/values";

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
