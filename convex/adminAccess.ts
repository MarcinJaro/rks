import { v } from "convex/values";

import { getAdminAccessStatus } from "./adminAuth";
import { query } from "./_generated/server";

const accessStatus = v.union(
  v.literal("authorized"),
  v.literal("unauthenticated"),
  v.literal("misconfigured"),
  v.literal("missing_email"),
  v.literal("forbidden"),
);

/**
 * Lekka bramka UX. Właściwą ochronę nadal egzekwuje requireAdmin w każdej
 * funkcji z danymi; ten status pozwala tylko pokazać czytelny ekran odmowy,
 * zanim zamontują się zapytania modułów panelu.
 */
export const status = query({
  args: {},
  returns: v.object({ status: accessStatus }),
  handler: async (ctx) => ({ status: await getAdminAccessStatus(ctx) }),
});
