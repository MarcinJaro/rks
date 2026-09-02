import { v } from "convex/values";

import { requireAdmin } from "./adminAuth";
import { adminTableName } from "./adminData";
import { query } from "./_generated/server";

const COUNT_LIMIT = 200;
const UPCOMING_GRACE_MS = 6 * 60 * 60 * 1000;

const countsValidator = v.object({
  appSettings: v.number(),
  articles: v.number(),
  documents: v.number(),
  fbPosts: v.number(),
  galleries: v.number(),
  liveStreams: v.number(),
  matchEvents: v.number(),
  matches: v.number(),
  pages: v.number(),
  people: v.number(),
  players: v.number(),
  regulationAcceptances: v.number(),
  settings: v.number(),
  sponsors: v.number(),
  standings: v.number(),
  storage: v.number(),
  syncSources: v.number(),
  teams: v.number(),
});

const activityValidator = v.object({
  id: v.string(),
  kind: v.union(
    v.literal("article"),
    v.literal("facebook"),
    v.literal("match"),
    v.literal("acceptance"),
    v.literal("gallery"),
  ),
  title: v.string(),
  detail: v.string(),
  at: v.number(),
  href: v.string(),
});

const attentionValidator = v.object({
  id: v.string(),
  tone: v.union(v.literal("warning"), v.literal("info")),
  title: v.string(),
  detail: v.string(),
  href: v.string(),
});

function count<T>(rows: T[]) {
  return Math.min(rows.length, COUNT_LIMIT);
}

function isCapped<T>(rows: T[]) {
  return rows.length > COUNT_LIMIT;
}

function polishForm(
  value: number,
  singular: string,
  paucal: string,
  plural: string,
) {
  if (value === 1) return singular;
  const lastTwo = value % 100;
  const last = value % 10;
  return last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)
    ? paucal
    : plural;
}

export const overview = query({
  args: { now: v.number() },
  returns: v.object({
    generatedAt: v.number(),
    counts: countsValidator,
    cappedTables: v.array(adminTableName),
    emptyTables: v.array(adminTableName),
    metrics: v.object({
      content: v.number(),
      publishedArticles: v.number(),
      drafts: v.number(),
      activeTeams: v.number(),
      coaches: v.number(),
      people: v.number(),
      players: v.number(),
      upcomingMatches: v.number(),
      upcomingMatchesCapped: v.boolean(),
      liveMatches: v.number(),
      hiddenFacebookPosts: v.number(),
      syncErrors: v.number(),
      unassignedMatches: v.number(),
      acceptances: v.number(),
    }),
    upcoming: v.array(
      v.object({
        id: v.id("matches"),
        homeTeam: v.string(),
        awayTeam: v.string(),
        date: v.number(),
        dateConfirmed: v.boolean(),
        roundLabel: v.optional(v.string()),
        venue: v.optional(v.string()),
        teamId: v.optional(v.id("teams")),
      }),
    ),
    recent: v.array(activityValidator),
    attention: v.array(attentionValidator),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const limit = COUNT_LIMIT + 1;
    const [
      appSettings,
      articles,
      documents,
      fbPosts,
      galleries,
      liveStreams,
      matchEvents,
      matches,
      pages,
      people,
      players,
      regulationAcceptances,
      settings,
      sponsors,
      standings,
      storage,
      syncSources,
      teams,
      upcomingMatchesForMetrics,
    ] = await Promise.all([
      ctx.db.query("appSettings").order("desc").take(limit),
      ctx.db.query("articles").order("desc").take(limit),
      ctx.db.query("documents").order("desc").take(limit),
      ctx.db.query("fbPosts").order("desc").take(limit),
      ctx.db.query("galleries").order("desc").take(limit),
      ctx.db.query("liveStreams").order("desc").take(limit),
      ctx.db.query("matchEvents").order("desc").take(limit),
      ctx.db.query("matches").order("desc").take(limit),
      ctx.db.query("pages").order("desc").take(limit),
      ctx.db.query("people").order("desc").take(limit),
      ctx.db.query("players").order("desc").take(limit),
      ctx.db.query("regulationAcceptances").order("desc").take(limit),
      ctx.db.query("settings").order("desc").take(limit),
      ctx.db.query("sponsors").order("desc").take(limit),
      ctx.db.query("standings").order("desc").take(limit),
      ctx.db.system.query("_storage").order("desc").take(limit),
      ctx.db.query("syncSources").order("desc").take(limit),
      ctx.db.query("teams").order("desc").take(limit),
      ctx.db
        .query("matches")
        .withIndex("by_status", (q) =>
          q
            .eq("status", "upcoming")
            .gte("date", args.now - UPCOMING_GRACE_MS),
        )
        .order("asc")
        .take(limit),
    ]);

    const collections = {
      appSettings,
      articles,
      documents,
      fbPosts,
      galleries,
      liveStreams,
      matchEvents,
      matches,
      pages,
      people,
      players,
      regulationAcceptances,
      settings,
      sponsors,
      standings,
      storage,
      syncSources,
      teams,
    };

    const counts = {
      appSettings: count(appSettings),
      articles: count(articles),
      documents: count(documents),
      fbPosts: count(fbPosts),
      galleries: count(galleries),
      liveStreams: count(liveStreams),
      matchEvents: count(matchEvents),
      matches: count(matches),
      pages: count(pages),
      people: count(people),
      players: count(players),
      regulationAcceptances: count(regulationAcceptances),
      settings: count(settings),
      sponsors: count(sponsors),
      standings: count(standings),
      storage: count(storage),
      syncSources: count(syncSources),
      teams: count(teams),
    };

    const tableEntries = Object.entries(collections) as [
      keyof typeof collections,
      unknown[],
    ][];
    const cappedTables = tableEntries
      .filter(([, rows]) => isCapped(rows))
      .map(([table]) => table);
    const emptyTables = tableEntries
      .filter(([, rows]) => rows.length === 0)
      .map(([table]) => table);

    // Rekord #201 służy wyłącznie jako sentinel informujący o limicie. Nie może
    // wpływać na pochodne KPI, bo interfejs pokazuje je jako wartości „200+”.
    const boundedArticles = articles.slice(0, COUNT_LIMIT);
    const boundedFbPosts = fbPosts.slice(0, COUNT_LIMIT);
    const boundedMatches = matches.slice(0, COUNT_LIMIT);
    const boundedPeople = people.slice(0, COUNT_LIMIT);
    const boundedSyncSources = syncSources.slice(0, COUNT_LIMIT);
    const boundedTeams = teams.slice(0, COUNT_LIMIT);
    const boundedUpcomingMatches = upcomingMatchesForMetrics.slice(0, COUNT_LIMIT);

    const drafts = boundedArticles.filter((article) => article.status === "draft").length;
    const publishedArticles = boundedArticles.filter(
      (article) => article.status === "published",
    ).length;
    const hiddenFacebookPosts = boundedFbPosts.filter((post) => post.isHidden).length;
    const syncErrors = boundedSyncSources.filter((source) => source.lastError).length;
    const upcomingMatches = count(upcomingMatchesForMetrics);
    const liveMatches = boundedMatches.filter((match) => match.status === "live").length;
    const unconfirmedMatches = boundedUpcomingMatches.filter(
      (match) => match.dateConfirmed === false,
    ).length;
    const unassignedMatches = boundedMatches.filter((match) => !match.teamId).length;

    const attention = [];
    if (syncErrors > 0) {
      attention.push({
        id: "sync-errors",
        tone: "warning" as const,
        title: `${syncErrors} ${polishForm(syncErrors, "źródło zgłasza", "źródła zgłaszają", "źródeł zgłasza")} błąd`,
        detail: "Sprawdź adres źródła i ostatnią próbę synchronizacji.",
        href: "/admin/druzyny",
      });
    }
    if (unconfirmedMatches > 0) {
      attention.push({
        id: "unconfirmed-matches",
        tone: "warning" as const,
        title: `${unconfirmedMatches} ${polishForm(unconfirmedMatches, "termin wymaga", "terminy wymagają", "terminów wymaga")} potwierdzenia`,
        detail: "Daty orientacyjne warto potwierdzić przed publikacją kolejki.",
        href: "/admin/mecze",
      });
    }
    if (unassignedMatches > 0) {
      attention.push({
        id: "unassigned-matches",
        tone: "warning" as const,
        title: `${unassignedMatches} ${polishForm(unassignedMatches, "mecz nie ma", "mecze nie mają", "meczów nie ma")} przypisanej drużyny`,
        detail: "Przypisz zespół, aby spotkania trafiały do właściwego terminarza.",
        href: "/admin/dane?table=matches",
      });
    }
    if (drafts > 0) {
      attention.push({
        id: "drafts",
        tone: "info" as const,
        title: `${drafts} ${polishForm(drafts, "artykuł czeka", "artykuły czekają", "artykułów czeka")} w szkicach`,
        detail: "Dokończ redakcję lub usuń nieaktualne materiały.",
        href: "/admin/articles",
      });
    }
    if (emptyTables.length > 0) {
      attention.push({
        id: "empty-tables",
        tone: "info" as const,
        title: `${emptyTables.length} ${polishForm(emptyTables.length, "tabela jest pusta", "tabele są puste", "tabel jest pustych")}`,
        detail: "Centrum danych pokazuje, które obszary nie mają jeszcze rekordów.",
        href: "/admin/dane",
      });
    }

    const recent = [
      ...articles.slice(0, 5).map((article) => ({
        id: `article-${article._id}`,
        kind: "article" as const,
        title: article.title,
        detail: article.status === "published" ? "Artykuł opublikowany" : "Szkic artykułu",
        at: article._creationTime,
        href: "/admin/articles",
      })),
      ...fbPosts.slice(0, 5).map((post) => ({
        id: `facebook-${post._id}`,
        kind: "facebook" as const,
        title: (post.content ?? "Post bez treści").slice(0, 90),
        detail: post.isHidden ? "Post ukryty" : "Post zsynchronizowany z Facebooka",
        at: post._creationTime,
        href: "/admin/fb-posts",
      })),
      ...matches.slice(0, 5).map((match) => ({
        id: `match-${match._id}`,
        kind: "match" as const,
        title: `${match.homeTeam} - ${match.awayTeam}`,
        detail: match.result ? `Wynik ${match.result}` : "Mecz w terminarzu",
        at: match._creationTime,
        href: "/admin/mecze",
      })),
      ...regulationAcceptances.slice(0, 5).map((acceptance) => ({
        id: `acceptance-${acceptance._id}`,
        kind: "acceptance" as const,
        title: `Akceptacja: ${acceptance.childName}`,
        detail: `Wersja regulaminu ${acceptance.documentVersion}`,
        at: acceptance._creationTime,
        href: "/admin/regulamin",
      })),
      ...galleries.slice(0, 5).map((gallery) => ({
        id: `gallery-${gallery._id}`,
        kind: "gallery" as const,
        title: gallery.title,
        detail: `Galeria, ${gallery.imageIds.length} zdjęć`,
        at: gallery._creationTime,
        href: "/admin/galerie",
      })),
    ]
      .sort((a, b) => b.at - a.at)
      .slice(0, 8);

    return {
      generatedAt: args.now,
      counts,
      cappedTables,
      emptyTables,
      metrics: {
        content:
          counts.articles +
          counts.fbPosts +
          counts.galleries +
          counts.documents +
          counts.pages,
        publishedArticles,
        drafts,
        activeTeams: boundedTeams.filter((team) => team.isActive).length,
        coaches: boundedPeople.filter((person) => person.role === "trener").length,
        people: counts.people,
        players: counts.players,
        upcomingMatches,
        upcomingMatchesCapped: isCapped(upcomingMatchesForMetrics),
        liveMatches,
        hiddenFacebookPosts,
        syncErrors,
        unassignedMatches,
        acceptances: counts.regulationAcceptances,
      },
      upcoming: upcomingMatchesForMetrics
        .slice(0, 6)
        .map((match) => ({
          id: match._id,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          date: match.date,
          dateConfirmed: match.dateConfirmed !== false,
          roundLabel: match.roundLabel,
          venue: match.venue,
          teamId: match.teamId,
        })),
      recent,
      attention,
    };
  },
});
