import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Jednorazowy seed danych z dotychczasowych plików statycznych
// (src/data/site.ts, src/data/legacy.ts). Idempotentny: istniejące
// rekordy (po slugu/nazwie/kluczu) są pomijane, nie nadpisywane.

const seedTeams = [
  { name: "Seniorzy - Liga okręgowa", slug: "seniorzy", league: "Liga okręgowa" },
  { name: "Seniorzy II - B Klasa", slug: "seniorzy2", league: "B Klasa" },
  { name: "Rocznik 2010", slug: "rocznik-2010", yearGroup: 2010 },
  { name: "Rocznik 2012", slug: "rocznik-2012", yearGroup: 2012 },
  { name: "Rocznik 2013", slug: "rocznik-2013", yearGroup: 2013 },
  { name: "Rocznik 2014", slug: "rocznik-2014", yearGroup: 2014 },
  { name: "Rocznik 2015", slug: "rocznik-2015", yearGroup: 2015 },
  { name: "Rocznik 2016", slug: "rocznik-2016", yearGroup: 2016 },
  { name: "Rocznik 2017", slug: "rocznik-2017", yearGroup: 2017 },
  { name: "Rocznik 2018", slug: "rocznik-2018", yearGroup: 2018 },
  { name: "Rocznik 2019", slug: "rocznik-2019", yearGroup: 2019 },
  { name: "Rocznik 2020 i młodsi", slug: "rocznik-2020", yearGroup: 2020 },
  { name: "Oldboy / Weterani", slug: "oldboy", league: "Oldboy" },
];

const seedCoaches: { name: string; position: string; teamSlug?: string }[] = [
  { name: "Adam Warszawski", position: "Trener seniorów", teamSlug: "seniorzy" },
  { name: "Piotr Łuczyk", position: "Trener rocznika 2010", teamSlug: "rocznik-2010" },
  { name: "Artur Bartosiński", position: "Trener rocznika 2012", teamSlug: "rocznik-2012" },
  { name: "Mikołaj Nowocień", position: "Trener rocznika 2012", teamSlug: "rocznik-2012" },
  { name: "Maciej Kilman", position: "Trener roczników 2013/2014", teamSlug: "rocznik-2013" },
  { name: "Karol Kuza", position: "Trener roczników 2013/2014", teamSlug: "rocznik-2014" },
  { name: "Karol Niziołek", position: "Trener rocznika 2015", teamSlug: "rocznik-2015" },
  { name: "Mariusz Wiśniewski", position: "Trener rocznika 2016", teamSlug: "rocznik-2016" },
  { name: "Pavlo Pytko", position: "Trener rocznika 2017", teamSlug: "rocznik-2017" },
  { name: "Tomasz Pęśko", position: "Trener roczników 2018-2020", teamSlug: "rocznik-2018" },
];

const seedBoard = [
  { name: "Tomasz Janicki", position: "Prezes Zarządu" },
  { name: "Joanna Pleban-Kilman", position: "Wiceprezes Zarządu ds. finansowych" },
  { name: "Grzegorz Malinowski", position: "Wiceprezes Zarządu ds. sportowych" },
  { name: "Jakub Gzik", position: "Członek Zarządu - Skarbnik" },
  { name: "Artur Mościcki", position: "Członek Zarządu" },
];

const seedLegends = [
  "Piotr Czachowski",
  "Jacek Cyzio",
  "Zbigniew Robakiewicz",
  "Marcin Rosłoń",
  "Mieczysław Pisz",
  "Maciej Tataj",
  "Stanley Udenkwor",
  "Adam Warszawski",
  "Piotr Wojdyga",
];

const seedSettings: [string, string][] = [
  ["contact_address", "ul. Radarowa 1, 02-137 Warszawa"],
  ["contact_phone", "798 876 570"],
  ["facebook_url", "https://www.facebook.com/rks.okeciewarszawa"],
  ["instagram_url", "https://www.instagram.com/rksokecie/"],
  ["youtube_url", "https://www.youtube.com/channel/UCwKI3pGnU3bZ44yfvhc_D5Q"],
];

export const seedFromLegacy = internalMutation({
  args: {},
  handler: async (ctx) => {
    const result = { teams: 0, people: 0, settings: 0, skipped: 0 };

    const teamIdBySlug = new Map<string, import("./_generated/dataModel").Id<"teams">>();
    for (const [index, team] of seedTeams.entries()) {
      const existing = await ctx.db
        .query("teams")
        .withIndex("by_slug", (q) => q.eq("slug", team.slug))
        .first();
      if (existing) {
        teamIdBySlug.set(team.slug, existing._id);
        result.skipped += 1;
        continue;
      }
      const id = await ctx.db.insert("teams", {
        ...team,
        isActive: true,
        sortOrder: index + 1,
      });
      teamIdBySlug.set(team.slug, id);
      result.teams += 1;
    }

    const existingPeople = await ctx.db.query("people").collect();
    const personKey = (name: string, role: string) => `${role}:${name}`;
    const existingKeys = new Set(
      existingPeople.map((person) => personKey(person.name, person.role)),
    );

    let coachOrder = 0;
    for (const coach of seedCoaches) {
      coachOrder += 1;
      if (existingKeys.has(personKey(coach.name, "trener"))) {
        result.skipped += 1;
        continue;
      }
      await ctx.db.insert("people", {
        name: coach.name,
        role: "trener",
        position: coach.position,
        teamId: coach.teamSlug ? teamIdBySlug.get(coach.teamSlug) : undefined,
        sortOrder: coachOrder,
      });
      result.people += 1;
    }

    let boardOrder = 0;
    for (const member of seedBoard) {
      boardOrder += 1;
      if (existingKeys.has(personKey(member.name, "zarząd"))) {
        result.skipped += 1;
        continue;
      }
      await ctx.db.insert("people", {
        name: member.name,
        role: "zarząd",
        position: member.position,
        sortOrder: boardOrder,
      });
      result.people += 1;
    }

    let legendOrder = 0;
    for (const name of seedLegends) {
      legendOrder += 1;
      if (existingKeys.has(personKey(name, "legenda"))) {
        result.skipped += 1;
        continue;
      }
      await ctx.db.insert("people", {
        name,
        role: "legenda",
        sortOrder: legendOrder,
      });
      result.people += 1;
    }

    for (const [key, value] of seedSettings) {
      const existing = await ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();
      if (existing) {
        result.skipped += 1;
        continue;
      }
      await ctx.db.insert("settings", { key, value });
      result.settings += 1;
    }

    return result;
  },
});

// Używane przez scripts/seed-files.mjs do wgrania logotypów i PDF-ów.
export const uploadUrl = internalMutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Poniższe trzy funkcje obsługują scripts/import-legacy-articles.mjs
// (migracja artykułów sezonu 2025/26 ze starego Drupala).

export const uploadUrls = internalMutation({
  args: { count: v.number() },
  handler: async (ctx, { count }) => {
    const urls: string[] = [];
    for (let i = 0; i < Math.min(count, 100); i += 1) {
      urls.push(await ctx.storage.generateUploadUrl());
    }
    return urls;
  },
});

export const storageUrls = internalQuery({
  args: { ids: v.array(v.id("_storage")) },
  handler: async (ctx, { ids }) => {
    return await Promise.all(ids.map((id) => ctx.storage.getUrl(id)));
  },
});

export const existingArticleSlugs = internalQuery({
  args: {},
  handler: async (ctx) => {
    const articles = await ctx.db.query("articles").collect();
    return articles.map((article) => article.slug);
  },
});

export const seedArticles = internalMutation({
  args: {
    items: v.array(
      v.object({
        title: v.string(),
        slug: v.string(),
        content: v.string(),
        contentHtml: v.string(),
        excerpt: v.optional(v.string()),
        publishedAt: v.number(),
        teamSlug: v.optional(v.string()),
        imageStorageId: v.optional(v.id("_storage")),
        galleryIds: v.optional(v.array(v.id("_storage"))),
      }),
    ),
  },
  handler: async (ctx, { items }) => {
    const result = { inserted: 0, skipped: 0, slugConflicts: [] as string[] };
    for (const { teamSlug, ...item } of items) {
      const existing = await ctx.db
        .query("articles")
        .withIndex("by_slug", (q) => q.eq("slug", item.slug))
        .first();
      // fbPosts i artykuły dzielą przestrzeń slugów w feed.getPostBySlug —
      // post FB o tym samym slugu przysłoniłby artykuł.
      const fbClash = await ctx.db
        .query("fbPosts")
        .withIndex("by_slug", (q) => q.eq("slug", item.slug))
        .first();
      if (existing || fbClash) {
        if (item.imageStorageId) await ctx.storage.delete(item.imageStorageId);
        for (const id of item.galleryIds ?? []) await ctx.storage.delete(id);
        result.skipped += 1;
        if (fbClash && !existing) result.slugConflicts.push(item.slug);
        continue;
      }
      const team = teamSlug
        ? await ctx.db
            .query("teams")
            .withIndex("by_slug", (q) => q.eq("slug", teamSlug))
            .first()
        : null;
      await ctx.db.insert("articles", {
        ...item,
        teamId: team?._id,
        status: "published",
      });
      result.inserted += 1;
    }
    return result;
  },
});

export const seedSponsors = internalMutation({
  args: {
    items: v.array(
      v.object({
        name: v.string(),
        url: v.optional(v.string()),
        label: v.optional(v.string()),
        type: v.union(v.literal("sponsor"), v.literal("partner")),
        logoStorageId: v.optional(v.id("_storage")),
      }),
    ),
  },
  handler: async (ctx, { items }) => {
    const existing = await ctx.db.query("sponsors").collect();
    const existingNames = new Set(existing.map((sponsor) => sponsor.name));
    let inserted = 0;
    for (const item of items) {
      if (existingNames.has(item.name)) {
        if (item.logoStorageId) await ctx.storage.delete(item.logoStorageId);
        continue;
      }
      const sameType = existing.filter((sponsor) => sponsor.type === item.type);
      const sortOrder =
        sameType.reduce((max, sponsor) => Math.max(max, sponsor.sortOrder), 0) +
        inserted +
        1;
      await ctx.db.insert("sponsors", { ...item, sortOrder });
      inserted += 1;
    }
    return { inserted, skipped: items.length - inserted };
  },
});

export const seedDocuments = internalMutation({
  args: {
    items: v.array(
      v.object({
        title: v.string(),
        category: v.string(),
        fileStorageId: v.id("_storage"),
      }),
    ),
  },
  handler: async (ctx, { items }) => {
    const existing = await ctx.db.query("documents").collect();
    const existingTitles = new Set(existing.map((doc) => doc.title));
    let sortOrder = existing.reduce(
      (max, doc) => Math.max(max, doc.sortOrder),
      0,
    );
    let inserted = 0;
    for (const item of items) {
      if (existingTitles.has(item.title)) {
        await ctx.storage.delete(item.fileStorageId);
        continue;
      }
      sortOrder += 1;
      await ctx.db.insert("documents", { ...item, sortOrder });
      inserted += 1;
    }
    return { inserted, skipped: items.length - inserted };
  },
});
