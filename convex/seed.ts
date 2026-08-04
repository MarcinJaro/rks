import { internalMutation } from "./_generated/server";

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
