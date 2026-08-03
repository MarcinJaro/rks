import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";

export async function requireAdmin(ctx: QueryCtx | MutationCtx | ActionCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Brak autoryzacji");
  }
  return identity;
}
