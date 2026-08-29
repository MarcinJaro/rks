import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireAdmin } from "./adminAuth";

export const active = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("liveStreams")
      .withIndex("by_status", (q) => q.eq("status", "live"))
      .order("desc")
      .first();
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const recent = await ctx.db.query("liveStreams").order("desc").take(20);
    // Zapomniana transmisja "live" nie może wypaść z panelu - jest widoczna
    // na stronie głównej i musi dać się wyłączyć.
    const live = await ctx.db
      .query("liveStreams")
      .withIndex("by_status", (q) => q.eq("status", "live"))
      .collect();
    const seen = new Set(recent.map((doc) => doc._id));
    return [...live.filter((doc) => !seen.has(doc._id)), ...recent];
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    youtubeUrl: v.string(),
    matchId: v.optional(v.id("matches")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!args.title.trim()) throw new Error("Podaj tytuł transmisji");
    return await ctx.db.insert("liveStreams", {
      ...args,
      status: "scheduled",
    });
  },
});

export const start = mutation({
  args: { id: v.id("liveStreams") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const live = await ctx.db
      .query("liveStreams")
      .withIndex("by_status", (q) => q.eq("status", "live"))
      .collect();
    for (const other of live) {
      await ctx.db.patch(other._id, { status: "ended", endedAt: Date.now() });
    }
    await ctx.db.patch(id, { status: "live", startsAt: Date.now() });
  },
});

export const end = mutation({
  args: { id: v.id("liveStreams") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { status: "ended", endedAt: Date.now() });
  },
});

export const saveToMatch = mutation({
  args: {
    id: v.id("liveStreams"),
    matchId: v.id("matches"),
    overwrite: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, matchId, overwrite }) => {
    await requireAdmin(ctx);
    const stream = await ctx.db.get(id);
    if (!stream) throw new Error("Nie znaleziono transmisji");
    const match = await ctx.db.get(matchId);
    if (!match) throw new Error("Nie znaleziono meczu");
    // Mecz może mieć już zapisany (właściwy) link - nadpisanie wymaga
    // świadomego potwierdzenia z UI.
    if (
      match.youtubeUrl &&
      match.youtubeUrl !== stream.youtubeUrl &&
      !overwrite
    ) {
      throw new ConvexError(
        "Ten mecz ma już zapisany inny link do transmisji. Potwierdź nadpisanie.",
      );
    }
    await ctx.db.patch(matchId, { youtubeUrl: stream.youtubeUrl });
    await ctx.db.patch(id, { matchId });
  },
});

export const remove = mutation({
  args: { id: v.id("liveStreams") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});
