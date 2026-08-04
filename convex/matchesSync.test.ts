import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { buildMatchId } from "./matchesSync";

const leagueHtmlUtf8 = readFileSync(
  new URL("./sources/__fixtures__/liga14256.html", import.meta.url),
  "utf8",
);
const viriumHtml = readFileSync(
  new URL("./sources/__fixtures__/virium-team.html", import.meta.url),
  "utf8",
);

const LEAGUE_URL = "http://www.90minut.pl/liga/1/liga14256.html";
const VIRIUM_URL =
  "https://web.virium.pl/rssport/teams/03ea137c-d0e4-4739-be1b-d5d95fe28977";

const asAdmin = { subject: "admin|1", issuer: "https://example.com" };

// Górna połowa ISO-8859-2 — lustro tablicy z convex/sources/encoding.ts.
const LATIN2_HIGH_RANGE =
  " Ą˘Ł¤ĽŚ§¨ŠŞŤŹ­ŽŻ" +
  "°ą˛ł´ľśˇ¸šşťź˝žż" +
  "ŔÁÂĂÄĹĆÇČÉĘËĚÍÎĎ" +
  "ĐŃŇÓÔŐÖ×ŘŮÚŰÜÝŢß" +
  "ŕáâăäĺćçčéęëěíîď" +
  "đńňóôőö÷řůúűüýţ˙";

// 90minut serwuje ISO-8859-2, więc sync czyta arrayBuffer. Próbki trzymamy
// w UTF-8, dlatego przed podaniem ich mockowi kodujemy je z powrotem.
function toIso88592(html: string) {
  return new Uint8Array(
    [...html].map((char) => {
      const code = char.charCodeAt(0);
      if (code < 0xa0) return code;
      const latin2 = LATIN2_HIGH_RANGE.indexOf(char);
      return latin2 >= 0 ? 0xa0 + latin2 : 0x3f;
    }),
  );
}

type StubRoute = { html?: string; status?: number };

function stubFetch(routes: Array<[RegExp, StubRoute]>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown) => {
      const url = String(input);
      const route = routes.find(([pattern]) => pattern.test(url))?.[1];
      if (!route) throw new Error(`Nieoczekiwane zapytanie: ${url}`);

      const status = route.status ?? 200;
      const html = route.html ?? "";
      const bytes = toIso88592(html);

      return {
        ok: status >= 200 && status < 300,
        status,
        arrayBuffer: async () => bytes.buffer,
        text: async () => html,
      };
    }),
  );
}

function mockFetchReturning(html: string, ok = true) {
  stubFetch([[/.*/, { html, status: ok ? 200 : 500 }]]);
}

// Minimalna strona o strukturze 90minut — pozwala sterować tym,
// czy mecz ma już wynik i czy tabela jest pusta.
function leaguePage(rows: string) {
  return `<html><body>
<table class="main2">
<tr>
<td colspan="14" class="main">
<b>Testowa Liga okręgowa 2025/2026, grupa: Warszawa II</b>
</td>
</tr>
</table>
<table>
${rows}
</table>
</body></html>`;
}

function matchRow(home: string, score: string, away: string, date: string) {
  return `<tr align="left">
<td nowrap valign="top" width="180">  ${home}  </td>
<td nowrap valign="top" align="center" width="50">${score}</td>
<td nowrap valign="top" width="180">  ${away}  </td>
<td valign="top" nowrap align="left" width="190">${date}</td>
</tr>`;
}

function roundHeader(label: string) {
  return `<tr>
<td colspan="3">
<img src="http://img.90minut.pl/img/redarrowl.gif" width="15" height="15" align="absmiddle">
 <b><u>${label}</u></b>
</td>
</tr>`;
}

async function seedTeam(t: ReturnType<typeof convexTest>, slug = "seniorzy") {
  return await t.run(async (ctx) =>
    ctx.db.insert("teams", {
      name: slug,
      slug,
      isActive: true,
      sortOrder: 0,
    }),
  );
}

async function addSource(
  t: ReturnType<typeof convexTest>,
  teamId: Id<"teams">,
  url: string,
  teamNameOnSource: string,
) {
  await t.withIdentity(asAdmin).mutation(api.syncSources.add, {
    teamId,
    url,
    teamNameOnSource,
    matchType: "liga",
  });
}

async function seedTeamWithSource(t: ReturnType<typeof convexTest>) {
  const teamId = await seedTeam(t);
  await addSource(t, teamId, LEAGUE_URL, "Okęcie Warszawa");
  return teamId;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buildMatchId", () => {
  it("buduje stabilny klucz niezależny od wyniku", () => {
    expect(buildMatchId("14256", "Champion Warszawa", "Okęcie Warszawa")).toBe(
      "90minut:14256:champion warszawa-okecie warszawa",
    );
  });

  it("rozróżnia gospodarza od gościa", () => {
    expect(buildMatchId("14256", "Okęcie Warszawa", "Champion Warszawa")).not.toBe(
      buildMatchId("14256", "Champion Warszawa", "Okęcie Warszawa"),
    );
  });
});

describe("syncAll", () => {
  it("zapisuje mecze naszej drużyny i tabelę", async () => {
    const t = convexTest(schema);
    const teamId = await seedTeamWithSource(t);
    mockFetchReturning(leagueHtmlUtf8);

    const result = await t.action(internal.matchesSync.syncAll, { force: true });
    expect(result.results[0].error).toBeUndefined();
    expect(result.results[0].upserted).toBeGreaterThan(0);

    const matches = await t.run(async (ctx) =>
      ctx.db.query("matches").collect(),
    );
    expect(matches.length).toBeGreaterThan(0);
    expect(
      matches.every(
        (match) =>
          match.homeTeam.includes("Okęcie") || match.awayTeam.includes("Okęcie"),
      ),
    ).toBe(true);
    expect(matches.every((match) => match.teamId === teamId)).toBe(true);
    expect(matches.every((match) => match.source === "ninetyminut")).toBe(true);
    expect(matches.every((match) => match.dateConfirmed === true)).toBe(true);
    expect(
      matches.some((match) => match.roundLabel === "1. kolejka, 9-10 sierpnia"),
    ).toBe(true);

    const table = await t.query(api.standings.byTeam, { teamId });
    expect(table!.rows.length).toBeGreaterThan(0);
    expect(table!.rows.some((row) => row.isRks)).toBe(true);
  });

  it("nie duplikuje meczów przy powtórnym uruchomieniu", async () => {
    const t = convexTest(schema);
    await seedTeamWithSource(t);
    mockFetchReturning(leagueHtmlUtf8);

    await t.action(internal.matchesSync.syncAll, { force: true });
    const first = await t.run(async (ctx) => ctx.db.query("matches").collect());
    await t.action(internal.matchesSync.syncAll, { force: true });
    const second = await t.run(async (ctx) => ctx.db.query("matches").collect());

    expect(second).toHaveLength(first.length);
  });

  it("aktualizuje mecz w miejscu, gdy pojawi się wynik", async () => {
    const t = convexTest(schema);
    await seedTeamWithSource(t);

    const withoutScore = leaguePage(
      matchRow("Okęcie Warszawa", "", "Champion Warszawa", "12 października, 15:00"),
    );
    const withScore = leaguePage(
      matchRow(
        "Okęcie Warszawa",
        "3-1",
        "Champion Warszawa",
        "12 października, 15:00",
      ),
    );

    mockFetchReturning(withoutScore);
    await t.action(internal.matchesSync.syncAll, { force: true });
    const before = await t.run(async (ctx) => ctx.db.query("matches").collect());
    expect(before).toHaveLength(1);
    expect(before[0].result).toBeUndefined();

    mockFetchReturning(withScore);
    await t.action(internal.matchesSync.syncAll, { force: true });
    const after = await t.run(async (ctx) => ctx.db.query("matches").collect());

    expect(after).toHaveLength(1);
    expect(after[0].result).toBe("3:1");
    expect(after[0].status).toBe("finished");
    expect(after[0]._id).toBe(before[0]._id);
  });

  it("mecz bez wyniku z minioną potwierdzoną datą jest finished", async () => {
    const t = convexTest(schema);
    await seedTeamWithSource(t);
    mockFetchReturning(
      leaguePage(
        matchRow(
          "Okęcie Warszawa",
          "",
          "Champion Warszawa",
          "12 października, 15:00",
        ),
      ),
    );

    await t.action(internal.matchesSync.syncAll, { force: true });
    const [match] = await t.run(async (ctx) =>
      ctx.db.query("matches").collect(),
    );
    expect(match.dateConfirmed).toBe(true);
    expect(match.status).toBe("finished");
  });

  it("mecz z terminem orientacyjnym zostaje upcoming mimo minionej daty", async () => {
    const t = convexTest(schema);
    await seedTeamWithSource(t);
    // Sezon 2025/2026, więc data z nagłówka kolejki wypada w przeszłości.
    mockFetchReturning(
      leaguePage(
        [
          roundHeader("Kolejka 1 - 8-9 sierpnia"),
          matchRow("Okęcie Warszawa", "", "Champion Warszawa", ""),
        ].join("\n"),
      ),
    );

    const { results } = await t.action(internal.matchesSync.syncAll, {
      force: true,
    });
    expect(results[0].upserted).toBe(1);

    const [match] = await t.run(async (ctx) =>
      ctx.db.query("matches").collect(),
    );
    expect(match.dateConfirmed).toBe(false);
    expect(match.roundLabel).toBe("1. kolejka, 8-9 sierpnia");
    expect(match.date).toBeLessThan(Date.now());
    expect(match.status).toBe("upcoming");
  });

  it("mecz z terminem orientacyjnym i wynikiem jest finished", async () => {
    const t = convexTest(schema);
    await seedTeamWithSource(t);
    mockFetchReturning(
      leaguePage(
        [
          roundHeader("Kolejka 1 - 8-9 sierpnia"),
          matchRow("Okęcie Warszawa", "3-1", "Champion Warszawa", ""),
        ].join("\n"),
      ),
    );

    await t.action(internal.matchesSync.syncAll, { force: true });
    const [match] = await t.run(async (ctx) =>
      ctx.db.query("matches").collect(),
    );
    expect(match.result).toBe("3:1");
    expect(match.status).toBe("finished");
  });

  it("zapisuje błąd źródła, gdy serwis odpowie błędem", async () => {
    const t = convexTest(schema);
    const teamId = await seedTeamWithSource(t);
    mockFetchReturning("", false);

    const result = await t.action(internal.matchesSync.syncAll, { force: true });
    expect(result.results[0].error).toBeTruthy();

    const [source] = await t
      .withIdentity(asAdmin)
      .query(api.syncSources.listByTeam, { teamId });
    expect(source.lastError).toBeTruthy();
  });

  it("czyści poprzedni błąd po udanym syncu", async () => {
    const t = convexTest(schema);
    const teamId = await seedTeamWithSource(t);

    mockFetchReturning("", false);
    await t.action(internal.matchesSync.syncAll, { force: true });

    mockFetchReturning(leagueHtmlUtf8);
    await t.action(internal.matchesSync.syncAll, { force: true });

    const [source] = await t
      .withIdentity(asAdmin)
      .query(api.syncSources.listByTeam, { teamId });
    expect(source.lastError).toBeUndefined();
  });

  it("awaria jednego źródła nie zatrzymuje pozostałych", async () => {
    const t = convexTest(schema);
    const seniors = await seedTeam(t, "seniorzy");
    const juniors = await seedTeam(t, "rocznik-2012");
    await addSource(t, seniors, LEAGUE_URL, "Okęcie Warszawa");
    await addSource(t, juniors, VIRIUM_URL, "RKS Okęcie");

    stubFetch([
      [/90minut\.pl/, { status: 500 }],
      [/virium\.pl/, { html: viriumHtml }],
    ]);

    const { results } = await t.action(internal.matchesSync.syncAll, {
      force: true,
    });

    const broken = results.find((entry) => entry.url === LEAGUE_URL)!;
    const healthy = results.find((entry) => entry.url === VIRIUM_URL)!;
    expect(broken.error).toBeTruthy();
    expect(broken.upserted).toBe(0);
    expect(healthy.error).toBeUndefined();
    expect(healthy.upserted).toBeGreaterThan(0);

    const matches = await t.run(async (ctx) =>
      ctx.db.query("matches").collect(),
    );
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((match) => match.source === "virium")).toBe(true);
    expect(matches.every((match) => match.teamId === juniors)).toBe(true);
  });

  it("awaria źródła nie przerywa syncu kolejnych źródeł tego samego rodzaju", async () => {
    const t = convexTest(schema);
    const first = await seedTeam(t, "rocznik-2012");
    const second = await seedTeam(t, "seniorzy");
    await addSource(
      t,
      first,
      "https://web.virium.pl/rssport/teams/11111111-2222-3333-4444-555555555555",
      "RKS Okęcie",
    );
    await addSource(t, second, VIRIUM_URL, "RKS Okęcie");

    stubFetch([
      [/11111111/, { status: 503 }],
      [/virium\.pl/, { html: viriumHtml }],
    ]);

    const { results } = await t.action(internal.matchesSync.syncAll, {
      force: true,
    });

    expect(results).toHaveLength(2);
    expect(results[0].error).toBeTruthy();
    expect(results[1].error).toBeUndefined();
    expect(results[1].upserted).toBeGreaterThan(0);
  });

  it("pusta tabela nie kasuje poprzedniej i nie wywraca syncu", async () => {
    const t = convexTest(schema);
    const teamId = await seedTeamWithSource(t);

    mockFetchReturning(leagueHtmlUtf8);
    await t.action(internal.matchesSync.syncAll, { force: true });
    const saved = await t.query(api.standings.byTeam, { teamId });
    expect(saved!.rows.length).toBeGreaterThan(0);

    mockFetchReturning(
      leaguePage(
        matchRow(
          "Okęcie Warszawa",
          "",
          "Champion Warszawa",
          "12 października, 15:00",
        ),
      ),
    );
    const { results } = await t.action(internal.matchesSync.syncAll, {
      force: true,
    });

    expect(results[0].error).toBeUndefined();
    expect(results[0].upserted).toBe(1);

    const table = await t.query(api.standings.byTeam, { teamId });
    expect(table!.rows).toEqual(saved!.rows);
  });

  it("pomija sync gdy auto-sync wyłączony i brak force", async () => {
    const t = convexTest(schema);
    await seedTeamWithSource(t);
    mockFetchReturning(leagueHtmlUtf8);
    await t.withIdentity(asAdmin).mutation(api.appSettings.setAutoSync, {
      enabled: false,
    });

    const result = await t.action(internal.matchesSync.syncAll, {});
    expect(result.skipped).toBe(true);
    expect(result.results).toHaveLength(0);
  });

  it("synchronizuje bez force, gdy auto-sync włączony", async () => {
    const t = convexTest(schema);
    await seedTeamWithSource(t);
    mockFetchReturning(leagueHtmlUtf8);

    const result = await t.action(internal.matchesSync.syncAll, {});
    expect(result.skipped).toBe(false);
    expect(result.results[0].upserted).toBeGreaterThan(0);
  });

  it("triggerSync wymaga admina", async () => {
    const t = convexTest(schema);
    await seedTeamWithSource(t);
    await expect(t.action(api.matchesSync.triggerSync, {})).rejects.toThrow();
  });

  it("triggerSync działa mimo wyłączonego auto-syncu", async () => {
    const t = convexTest(schema);
    await seedTeamWithSource(t);
    mockFetchReturning(leagueHtmlUtf8);
    const admin = t.withIdentity(asAdmin);
    await admin.mutation(api.appSettings.setAutoSync, { enabled: false });

    const result = await admin.action(api.matchesSync.triggerSync, {});
    expect(result.skipped).toBe(false);
    expect(result.results[0].upserted).toBeGreaterThan(0);
  });
});
