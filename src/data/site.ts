export const navItems = [
  { label: "Aktualności", href: "/aktualnosci" },
  { label: "Drużyny", href: "/druzyny" },
  { label: "Klub", href: "/klub/historia" },
  { label: "Kibice", href: "/kibice/historia" },
  { label: "Rodzice", href: "/rodzice" },
  { label: "Wspieraj", href: "/wspieraj" },
  { label: "Kontakt", href: "/kontakt" },
];

export const teams = [
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

export const fallbackPosts = [
  {
    source: "facebook",
    title: "Seniorzy wracają na zwycięską ścieżkę",
    content:
      "RKS Okęcie pokonał KS Milan Milanówek 1:0 w meczu 24. kolejki ligi okręgowej. Bramkę na wagę trzech punktów zdobył w 68. minucie Konstantyn Ślęzak po skutecznej dobitce. Po wymagającym spotkaniu przy Radarowej drużyna pokazała charakter, cierpliwość i wróciła do punktowania po trzech meczach bez zdobyczy.",
    imageUrl: "/images/facebook/rks-okecie-milan-milanowek-2026-05-04.jpg",
    publishedAt: new Date("2026-05-04T06:39:00+02:00").getTime(),
    engagement: { reactions: 0, comments: 0, shares: 0 },
    url: "https://www.facebook.com/rks.okeciewarszawa/posts/1789391695718842",
  },
  {
    source: "facebook",
    title: "Wyjściowa jedenastka na mecz z KS Milan Milanówek",
    content:
      "Sztab seniorów RKS Okęcie ogłosił skład na ligowe spotkanie z KS Milan Milanówek. W wyjściowej jedenastce znaleźli się między innymi Kruszewski, Przygoda, Bujak, kapitan Huczuk oraz Ślęzak. Drużyna przystąpiła do meczu z jasnym celem: walczyć o pełną pulę punktów.",
    imageUrl: "/images/facebook/rks-okecie-sklad-milan-milanowek-2026-05-03.jpg",
    imageFit: "contain" as const,
    publishedAt: new Date("2026-05-03T07:01:00+02:00").getTime(),
    engagement: { reactions: 0, comments: 0, shares: 0 },
    url: "https://www.facebook.com/rks.okeciewarszawa/posts/1788535399137805",
  },
  {
    source: "facebook",
    title: "Kacper Mirosz broni rzut karny",
    content:
      "W materiale video z rocznika 2010 Kacper Mirosz zatrzymuje rzut karny w ostatnim meczu. To kolejna obroniona jedenastka naszego bramkarza i bardzo dobry sygnał formy w końcówce sezonu. Brawo Kacper, tak trzymać.",
    imageUrl: "/images/facebook/rks-okecie-karny-rocznik-2010-2026-05.jpg",
    imageFit: "contain" as const,
    mediaType: "video" as const,
    publishedAt: new Date("2026-05-01T12:00:00+02:00").getTime(),
    engagement: { reactions: 0, comments: 0, shares: 0 },
    url: "https://www.facebook.com/reel/1472671047874285/",
  },
];

export type MatchItem = {
  _id?: string;
  teamSlug?: string;
  teamName?: string;
  sourceLabel?: string;
  homeTeam: string;
  awayTeam: string;
  date: number;
  venue?: string;
  result?: string;
  matchType: "liga" | "sparing" | "turniej" | "puchar";
  status: "upcoming" | "live" | "finished";
};

export const fallbackMatchCenter: {
  nextMatch: MatchItem | null;
  upcoming: MatchItem[];
  latestResults: MatchItem[];
} = {
  nextMatch: null,
  upcoming: [],
  latestResults: [],
};

export const clubInfo = {
  name: "Robotniczy Klub Sportowy Okęcie Warszawa",
  shortName: "RKS Okęcie Warszawa",
  founded: "1929",
  colors: "niebiesko-białe",
  address: "ul. Radarowa 1, 02-137 Warszawa",
  phone: "798 876 570",
  email: "rksokecie@rksokecie.pl",
  nip: "522-22-55-140",
  krs: "0000021958",
};
