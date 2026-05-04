export type MatchType = "liga" | "sparing" | "turniej" | "puchar";

export type MatchSourceType =
  | "lnp"
  | "regionalnyfutbol"
  | "futbolowo"
  | "virium"
  | "external";

export type MatchCenterTeam = {
  slug: string;
  label: string;
  description: string;
  yearGroup?: number;
  parentSlug?: string;
};

export type MatchSourceConfig = {
  type: MatchSourceType;
  teamSlug: string;
  label: string;
  url?: string;
  playId?: string;
  teamId?: string;
  competitionId?: string;
  matchType: MatchType;
  fetchable: boolean;
};

export const matchCenterTeams: MatchCenterTeam[] = [
  {
    slug: "seniorzy",
    label: "Seniorzy",
    description: "Liga okręgowa, grupa Warszawa II",
  },
  {
    slug: "seniorzy2",
    label: "Seniorzy II",
    description: "Rezerwy RKS Okęcie",
  },
  {
    slug: "rocznik-2010-i",
    label: "Rocznik 2010 I",
    description: "Pierwszy zespół rocznika 2010",
    yearGroup: 2010,
    parentSlug: "rocznik-2010",
  },
  {
    slug: "rocznik-2010-ii",
    label: "Rocznik 2010 II",
    description: "Drugi zespół rocznika 2010",
    yearGroup: 2010,
    parentSlug: "rocznik-2010",
  },
  {
    slug: "rocznik-2012",
    label: "Rocznik 2012",
    description: "Rozgrywki młodzieżowe i ligi zimowe",
    yearGroup: 2012,
  },
];

export const matchSources: MatchSourceConfig[] = [
  {
    type: "regionalnyfutbol",
    teamSlug: "seniorzy",
    label: "Regionalny Futbol",
    url: "https://regionalnyfutbol.pl/liga%2Cklasa-okregowa-mazowiecka-grupa-warszawa-ii-sezon-2025-2026%2Cokecie-warszawa.html",
    matchType: "liga",
    fetchable: true,
  },
  {
    type: "futbolowo",
    teamSlug: "seniorzy",
    label: "Futbolowo - puchar",
    url: "https://rksokecie.futbolowo.pl/schedule/3637/27558/4458",
    matchType: "puchar",
    fetchable: true,
  },
  {
    type: "futbolowo",
    teamSlug: "seniorzy",
    label: "Futbolowo - liga",
    url: "https://rksokecie.futbolowo.pl/schedule/20464/27558/4458",
    matchType: "liga",
    fetchable: true,
  },
  {
    type: "external",
    teamSlug: "rocznik-2010-i",
    label: "MZPN play_id 51848",
    url: "https://www.mzpn.pl/rozgrywki/tabele-i-terminarze/?play_id=51848",
    playId: "51848",
    matchType: "liga",
    fetchable: false,
  },
  {
    type: "external",
    teamSlug: "rocznik-2010-ii",
    label: "MZPN play_id 51855",
    url: "https://www.mzpn.pl/rozgrywki/tabele-i-terminarze/?play_id=51855",
    playId: "51855",
    matchType: "liga",
    fetchable: false,
  },
  {
    type: "virium",
    teamSlug: "rocznik-2012",
    label: "RS Sport / Virium",
    url: "https://web.virium.pl/rssport/teams/03ea137c-d0e4-4739-be1b-d5d95fe28977",
    teamId: "03ea137c-d0e4-4739-be1b-d5d95fe28977",
    competitionId: "20de15e0-13d9-4877-8d01-dbcaf77937d0",
    matchType: "liga",
    fetchable: true,
  },
];

export function getMatchCenterTeam(slug: string) {
  return matchCenterTeams.find((team) => team.slug === slug);
}

export function getFetchableMatchSources(teamSlug?: string) {
  return matchSources.filter(
    (source) => source.fetchable && (!teamSlug || source.teamSlug === teamSlug),
  );
}

export function getMatchSourcesForTeam(teamSlug: string) {
  return matchSources.filter((source) => source.teamSlug === teamSlug);
}
