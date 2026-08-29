import { coaches } from "./legacy";

export type RosterPerson = {
  name: string;
  number?: string;
  photoUrl?: string;
};

export type TeamRoster = {
  players: RosterPerson[];
  coaches: RosterPerson[];
};

type RosterEntry = {
  name: string;
  number?: string;
  /** Nazwa pliku (bez rozszerzenia) w public/images/players/<slug drużyny>/. */
  photo?: string;
};

// Kadry dorosłych drużyn przeniesione ze starego serwisu Drupal wraz ze
// zdjęciami. Roczniki młodzieżowe zostały wyczyszczone na wniosek klubu -
// nazwiska i zdjęcia niepełnoletnich zawodników wprowadza się teraz wyłącznie
// w panelu administracyjnym (tabela `players` w Convex). Ten plik jest już
// tylko materiałem zapasowym dla drużyn, które nie mają wpisów w panelu.
const rosterEntries: Record<string, RosterEntry[]> = {
  "seniorzy": [
    { name: "Moatasem Aziz", photo: "aziz-moatasem" },
    { name: "Krzysztof Bujak", photo: "bujak-krzysztof" },
    { name: "Krzysztof Capar", photo: "capar-krzysztof" },
    { name: "Dominik Dedek", photo: "dedek-dominik" },
    { name: "Michał Dziubek", photo: "dziubek-michal" },
    { name: "Hubert Ihnatowicz", photo: "ihnatowicz-hubert" },
    { name: "Fabian Kaleta", photo: "kaleta-fabian" },
    { name: "Kuba Kruszewski", photo: "kruszewski-kuba" },
    { name: "Maksym Leski", photo: "leski-maksym" },
    { name: "Mateusz Łuczak", photo: "luczak-mateusz" },
    { name: "Mateusz Łuczyk", photo: "luczyk-mateusz" },
    { name: "Bartłomiej Maciąg", photo: "maciag-bartlomiej" },
    { name: "Konrad Miciński", photo: "micinski-konrad" },
    { name: "Yauheni Novik", photo: "novik-yauheni" },
    { name: "Paweł Olędzki", photo: "oledzki-pawel" },
    { name: "Filip Przygoda", photo: "przygoda-filip" },
    { name: "Mikołaj Rałowiec", photo: "ralowiec-mikolaj" },
    { name: "Mateusz Rymarz", photo: "rymarz-mateusz" },
    { name: "Adam Szklanko", photo: "szklanko-adam" },
    { name: "Bartosz Szoja", photo: "szoja-bartosz" },
    { name: "Szymon Ścięgosz", photo: "sciegosz-szymon" },
    { name: "Konstantyn Ślęzak", photo: "slezak-konstantyn" },
    { name: "Bartłomiej Warchoł", photo: "warchol-bartlomiej" },
    { name: "Piotr Żuk", photo: "zuk-piotr" },
  ],
  "seniorzy2": [
    { name: "Jeremiasz Małaszyński", number: "7", photo: "jeremiasz-malaszynski" },
  ],
  // Kadra prowadzona w panelu administracyjnym.
  "rocznik-2010": [],
  // Kadra prowadzona w panelu administracyjnym.
  "rocznik-2012": [],
  // Kadra prowadzona w panelu administracyjnym.
  "rocznik-2013": [],
  // Kadra prowadzona w panelu administracyjnym.
  "rocznik-2014": [],
  // Kadra prowadzona w panelu administracyjnym.
  "rocznik-2015": [],
  // Kadra prowadzona w panelu administracyjnym.
  "rocznik-2016": [],
  // Kadra prowadzona w panelu administracyjnym.
  "rocznik-2017": [],
  // Kadra prowadzona w panelu administracyjnym.
  "rocznik-2018": [],
  // Kadra prowadzona w panelu administracyjnym.
  "rocznik-2019": [],
  // Kadra prowadzona w panelu administracyjnym.
  "rocznik-2020": [],
  "oldboy": [
    { name: "Częścik Piotr", photo: "czescik-piotr" },
    { name: "Dedek Adam", photo: "dedek-adam" },
    { name: "Dziedzic Dominik" },
    { name: "Filaber Włodzimierz" },
    { name: "Gręba Marcin", photo: "greba-marcin" },
    { name: "Jasiński Zbigniew" },
    { name: "Kaczmarek Robert" },
    { name: "Choiński Michał" },
    { name: "Feliksiak Janusz", photo: "feliksiak-janusz" },
    { name: "Walisch Dominik" },
    { name: "Gugała Janusz", photo: "gugala-janusz" },
    { name: "Keni Oguz", photo: "keni-oguz" },
    { name: "Michalak Piotr" },
    { name: "Dźwigała Mariusz", photo: "dzwigala-mariusz" },
    { name: "Gędziorowski Marcin", photo: "gedziorowski-marcin" },
    { name: "Janicki Tomasz", photo: "janicki-tomasz" },
    { name: "Stan Jarosław", photo: "stan-jaroslaw" },
    { name: "Zdunek Piotr", photo: "zdunek-piotr" },
    { name: "Zagrajek Marek" },
    { name: "Glinka Sławomir" },
    { name: "Waszkiewicz Jan" },
  ],
};

// Sztab pochodzi z listy w legacy.ts (aktualizowanej ręcznie), więc przypisania
// i telefony nie rozjeżdżają się ze stroną /klub/sztab.
function slugForLabel(label: string) {
  if (/^Seniorzy II/.test(label)) return "seniorzy2";
  if (/^Seniorzy/.test(label)) return "seniorzy";
  if (/^Oldboy/.test(label)) return "oldboy";

  const yearGroup = label.match(/^Rocznik (\d{4})/);

  return yearGroup ? `rocznik-${yearGroup[1]}` : null;
}

function slugsForAssignment(assignment: string) {
  return assignment
    .split("/")
    .map((part) => slugForLabel(part.trim()))
    .filter((slug): slug is string => slug !== null);
}

function coachesForTeam(slug: string): RosterPerson[] {
  return coaches
    .filter((coach) => slugsForAssignment(coach.team).includes(slug))
    .map((coach) => ({ name: coach.name, photoUrl: coach.photo ?? undefined }));
}

export function getTeamRoster(slug: string): TeamRoster | null {
  const entries = rosterEntries[slug];
  if (!entries) return null;

  const players = entries.map((entry) => ({
    name: entry.name,
    number: entry.number,
    photoUrl: entry.photo
      ? `/images/players/${slug}/${entry.photo}.webp`
      : undefined,
  }));

  return { players, coaches: coachesForTeam(slug) };
}
