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
    title: "Seniorzy RKS Okęcie",
    content:
      "Aktualności meczowe seniorów, zapowiedzi spotkań i relacje z Radarowej znajdziesz w klubowym feedzie.",
    imageUrl: "/images/figma/feed-match.png",
    publishedAt: new Date("2026-04-20T12:00:00+02:00").getTime(),
    engagement: { reactions: 0, comments: 0, shares: 0 },
    url: "https://www.facebook.com/rks.okeciewarszawa",
  },
  {
    source: "cms",
    title: "Nabór do drużyn młodzieżowych",
    content:
      "Akademia RKS Okęcie prowadzi szkolenie dzieci i młodzieży w grupach rocznikowych. W sprawie zapisów najlepiej skontaktować się z trenerem danego rocznika.",
    imageUrl: "/images/figma/feed-balls.png",
    publishedAt: new Date("2026-04-10T12:00:00+02:00").getTime(),
    engagement: { reactions: 0, comments: 0, shares: 0 },
    url: "/druzyny",
  },
  {
    source: "facebook",
    title: "Treningi przy Radarowej",
    content:
      "Boiska przy ul. Radarowej 1 są centrum codziennej pracy klubu: treningów, meczów ligowych, turniejów i spotkań całej społeczności RKS Okęcie.",
    imageUrl: "/images/figma/feed-shirt.png",
    publishedAt: new Date("2026-03-31T12:00:00+02:00").getTime(),
    engagement: { reactions: 0, comments: 0, shares: 0 },
    url: "https://www.facebook.com/rks.okeciewarszawa",
  },
];

export type MatchItem = {
  _id?: string;
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
