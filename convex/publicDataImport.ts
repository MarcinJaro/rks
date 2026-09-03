import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, internalQuery } from "./_generated/server";

const SENIOR_TEAM_SLUG = "seniorzy";

// Kolejność jest identyczna jak na publicznej stronie. Import jest celowo
// ograniczony do kompletnej, zweryfikowanej kadry pierwszego zespołu: publiczny
// komponent przełącza się na Convex już po pojawieniu się jednego rekordu, więc
// częściowy zapis ukryłby pozostałych zawodników.
const seniorPlayerNames = [
  "Moatasem Aziz",
  "Krzysztof Bujak",
  "Krzysztof Capar",
  "Dominik Dedek",
  "Michał Dziubek",
  "Hubert Ihnatowicz",
  "Fabian Kaleta",
  "Kuba Kruszewski",
  "Maksym Leski",
  "Mateusz Łuczak",
  "Mateusz Łuczyk",
  "Bartłomiej Maciąg",
  "Konrad Miciński",
  "Yauheni Novik",
  "Paweł Olędzki",
  "Filip Przygoda",
  "Mikołaj Rałowiec",
  "Mateusz Rymarz",
  "Adam Szklanko",
  "Bartosz Szoja",
  "Szymon Ścięgosz",
  "Konstantyn Ślęzak",
  "Bartłomiej Warchoł",
  "Piotr Żuk",
] as const;

const auditValidator = v.object({
  teamFound: v.boolean(),
  existingCount: v.number(),
  withPhotoCount: v.number(),
  availablePhotoCount: v.number(),
  namesMatch: v.boolean(),
  complete: v.boolean(),
  missingNames: v.array(v.string()),
  unexpectedNames: v.array(v.string()),
});

async function auditSeniorRoster(ctx: QueryCtx | MutationCtx) {
  const team = await ctx.db
    .query("teams")
    .withIndex("by_slug", (q) => q.eq("slug", SENIOR_TEAM_SLUG))
    .first();

  if (!team) {
    return {
      teamFound: false,
      existingCount: 0,
      withPhotoCount: 0,
      availablePhotoCount: 0,
      namesMatch: false,
      complete: false,
      missingNames: [...seniorPlayerNames],
      unexpectedNames: [],
    };
  }

  const players = await ctx.db
    .query("players")
    .withIndex("by_team", (q) => q.eq("teamId", team._id))
    .order("asc")
    .collect();
  const existingNames = players.map((player) => player.name);
  const expectedNames = new Set<string>(seniorPlayerNames);
  const existingNameSet = new Set(existingNames);
  const namesMatch =
    existingNames.length === seniorPlayerNames.length &&
    existingNames.every((name, index) => name === seniorPlayerNames[index]);
  const withPhotoCount = players.filter((player) => player.photoStorageId).length;
  const availablePhotoCount = (
    await Promise.all(
      players.map(async (player) =>
        player.photoStorageId
          ? Boolean(await ctx.storage.getUrl(player.photoStorageId))
          : false,
      ),
    )
  ).filter(Boolean).length;

  return {
    teamFound: true,
    existingCount: players.length,
    withPhotoCount,
    availablePhotoCount,
    namesMatch,
    complete:
      namesMatch &&
      withPhotoCount === seniorPlayerNames.length &&
      availablePhotoCount === seniorPlayerNames.length,
    missingNames: seniorPlayerNames.filter((name) => !existingNameSet.has(name)),
    unexpectedNames: existingNames.filter((name) => !expectedNames.has(name)),
  };
}

export const seniorRosterAudit = internalQuery({
  args: {},
  returns: auditValidator,
  handler: async (ctx) => await auditSeniorRoster(ctx),
});

const importResultValidator = v.object({
  status: v.union(
    v.literal("imported"),
    v.literal("already_complete"),
    v.literal("conflict"),
  ),
  inserted: v.number(),
  removedUploads: v.number(),
  audit: auditValidator,
});

async function discardUnreferencedSeniorUploads(
  ctx: MutationCtx,
  storageIds: Doc<"players">["photoStorageId"][],
) {
  let removed = 0;
  let preserved = 0;
  for (const storageId of storageIds) {
    if (!storageId) continue;
    const referencedPlayer = await ctx.db
      .query("players")
      .withIndex("by_photoStorageId", (q) =>
        q.eq("photoStorageId", storageId),
      )
      .first();
    if (referencedPlayer) {
      preserved += 1;
      continue;
    }
    await ctx.storage.delete(storageId);
    removed += 1;
  }
  return { removed, preserved };
}

export const importSeniorRoster = internalMutation({
  args: {
    players: v.array(
      v.object({
        name: v.string(),
        photoStorageId: v.id("_storage"),
      }),
    ),
  },
  returns: importResultValidator,
  handler: async (ctx, { players }) => {
    if (
      players.length !== seniorPlayerNames.length ||
      players.some(
        (player, index) => player.name.trim() !== seniorPlayerNames[index],
      )
    ) {
      throw new Error(
        `Import seniorów musi zawierać dokładnie ${seniorPlayerNames.length} zweryfikowanych osób w kolejności ze strony`,
      );
    }

    const uniqueStorageIds = new Set(
      players.map((player) => player.photoStorageId),
    );
    if (uniqueStorageIds.size !== players.length) {
      throw new Error("Każdy zawodnik musi mieć własne zdjęcie");
    }
    for (const player of players) {
      if (!(await ctx.storage.getUrl(player.photoStorageId))) {
        throw new Error(`Brak przesłanego zdjęcia: ${player.name}`);
      }
    }

    const before = await auditSeniorRoster(ctx);
    if (before.complete || before.existingCount > 0) {
      const cleanup = await discardUnreferencedSeniorUploads(
        ctx,
        players.map((player) => player.photoStorageId),
      );
      return {
        status: before.complete
          ? ("already_complete" as const)
          : ("conflict" as const),
        inserted: 0,
        removedUploads: cleanup.removed,
        audit: before,
      };
    }

    const team = await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", SENIOR_TEAM_SLUG))
      .unique();
    if (!team) throw new Error("Nie znaleziono drużyny seniorów");

    for (const [index, player] of players.entries()) {
      await ctx.db.insert("players", {
        name: player.name.trim(),
        teamId: team._id,
        photoStorageId: player.photoStorageId,
        sortOrder: index + 1,
      });
    }

    return {
      status: "imported" as const,
      inserted: players.length,
      removedUploads: 0,
      audit: await auditSeniorRoster(ctx),
    };
  },
});

export const discardUnreferencedPlayerUploads = internalMutation({
  args: { storageIds: v.array(v.id("_storage")) },
  returns: v.object({ removed: v.number(), preserved: v.number() }),
  handler: async (ctx, { storageIds }) => {
    return await discardUnreferencedSeniorUploads(ctx, storageIds);
  },
});

const publicSettings = [
  ["contact_email", "rksokecie@rksokecie.pl"],
  ["kit_price", "320 zł"],
  ["kit_order_email", "stroje@rksokecie.pl"],
] as const;

const sponsorDefaults = [
  { name: "NIW", url: "/klub/niw-crso" },
  {
    name: "Certyfikacja PZPN",
    url: "/klub/certyfikacja-pzpn",
    label: "Program",
  },
] as const;

export const syncSafePublicDefaults = internalMutation({
  args: {},
  returns: v.object({
    insertedSettings: v.array(v.string()),
    updatedSponsors: v.array(v.string()),
    missingSponsors: v.array(v.string()),
  }),
  handler: async (ctx) => {
    const insertedSettings: string[] = [];
    for (const [key, value] of publicSettings) {
      const existing = await ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();
      if (!existing) {
        await ctx.db.insert("settings", { key, value });
        insertedSettings.push(key);
      }
    }

    const sponsors = await ctx.db.query("sponsors").collect();
    const updatedSponsors: string[] = [];
    const missingSponsors: string[] = [];
    for (const defaults of sponsorDefaults) {
      const sponsor = sponsors.find((item) => item.name === defaults.name);
      if (!sponsor) {
        missingSponsors.push(defaults.name);
        continue;
      }
      const patch: Partial<Doc<"sponsors">> = {};
      if (!sponsor.url) patch.url = defaults.url;
      if ("label" in defaults && !sponsor.label) patch.label = defaults.label;
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(sponsor._id, patch);
        updatedSponsors.push(sponsor.name);
      }
    }

    return { insertedSettings, updatedSponsors, missingSponsors };
  },
});
