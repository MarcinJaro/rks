import { query } from "./_generated/server";
import { v } from "convex/values";

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
