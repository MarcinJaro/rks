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

// Kadry przeniesione ze starego serwisu Drupal wraz ze zdjęciami; seniorzy mają
// komplet zdjęć z sesji z sierpnia 2026. Dane są lokalne - po wyłączeniu Drupala
// nic tu nie przestanie działać.
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
  "rocznik-2010": [
    { name: "Bartosz Golder", number: "1", photo: "bartosz-golder" },
    { name: "Mikołaj Szklarczyk", number: "50", photo: "mikolaj-szklarczyk" },
    { name: "Antek Plich", number: "75", photo: "antek-plich" },
    { name: "Konrad Lao", number: "16", photo: "konrad-lao" },
    { name: "Filip Zych", number: "23", photo: "filip-zych" },
    { name: "Jakub Kordala", number: "25", photo: "jakub-kordala" },
    { name: "Borys Kopeć", number: "29", photo: "borys-kopec" },
    { name: "Mateusz Rymarz", number: "11", photo: "mateusz-rymarz" },
    { name: "Francesco Bruzzone", number: "17", photo: "francesco-bruzzone" },
    { name: "Yulan Fu Dostatny", number: "12", photo: "yulan-fu-dostatny" },
    { name: "Adam Błachowski", number: "1", photo: "adam-blachowski" },
    { name: "Patryk Tarkowski", number: "10", photo: "patryk-tarkowski" },
    { name: "Patryk Szawarski", number: "8", photo: "patryk-szawarski" },
    { name: "Borys Gajlewicz", number: "9", photo: "borys-gajlewicz" },
    { name: "Maurycy Baszta", number: "22", photo: "maurycy-baszta" },
    { name: "Maciej Michalski", number: "14", photo: "maciej-michalski" },
    { name: "Filip Cyrankowski", number: "2", photo: "filip-cyrankowski" },
    { name: "Michał Balcerzak", number: "20", photo: "michal-balcerzak" },
    { name: "Karol Nguyen", number: "21" },
    { name: "Stanisław Biskot-Jenda", number: "24", photo: "stanislaw-biskot-jenda" },
    { name: "Milan Jaroszewicz", number: "26", photo: "milan-jaroszewicz" },
    { name: "Łukasz Chmielak", number: "30", photo: "lukasz-chmielak" },
    { name: "Wojciech Czachura", number: "32", photo: "wojciech-czachura" },
    { name: "Borys Mikina", number: "33", photo: "borys-mikina" },
    { name: "Piotr Gawin", number: "36" },
    { name: "Franciszek Mildner", number: "37" },
    { name: "Michał Wójcik", number: "39", photo: "michal-wojcik" },
    { name: "Kacper Cwalina", number: "43", photo: "kacper-cwalina" },
    { name: "Oleksii Tsyganov", number: "44" },
    { name: "Marek Świstak", number: "5" },
    { name: "Kajetan Krupnik", number: "51" },
    { name: "Gustaw Kleiber", number: "54" },
    { name: "Vo Van Duc Khoa", number: "56" },
    { name: "Jan Wąsiewicz", number: "62", photo: "jan-wasiewicz" },
    { name: "Iwo Rajnowski - Janiak", number: "68", photo: "iwo-rajnowski-janiak" },
    { name: "Tymon Sieradzki", number: "7" },
    { name: "Emin Karakus", number: "82" },
    { name: "Bartosz Janiszewski", number: "83", photo: "bartosz-janiszewski" },
    { name: "Krystian Markowski", number: "86", photo: "krystian-markowski" },
    { name: "Aleksander Do Duc", number: "88" },
    { name: "Julian Krawczyk", number: "99", photo: "julian-krawczyk" },
    { name: "Maksym Kosheiev" },
  ],
  "rocznik-2012": [
    { name: "Eryk Szelbracikowski", number: "1", photo: "eryk-szelbracikowski" },
    { name: "Adrian Zozula", photo: "adrian-zozula" },
    { name: "Szymon Banasiak", number: "10", photo: "szymon-banasiak" },
    { name: "Tymon Filipek", number: "13", photo: "tymon-filipek" },
    { name: "Robert Winnicki", number: "15", photo: "robert-winnicki" },
    { name: "Karol Białek", number: "17", photo: "karol-bialek" },
    { name: "Wojciech Rębiś", number: "18", photo: "wojciech-rebis" },
    { name: "Adam Wdowczyk - Kieliszek", number: "2", photo: "adam-wdowczyk-kieliszek" },
    { name: "Bartosz Gałązka", number: "23", photo: "bartosz-galazka" },
    { name: "Antek Polak", number: "25", photo: "antek-polak" },
    { name: "Kuba Chrzanowski", number: "26", photo: "kuba-chrzanowski" },
    { name: "Kamil Miłowski", number: "3", photo: "kamil-milowski" },
    { name: "Jerzy Ruta", number: "5", photo: "jerzy-ruta" },
    { name: "Dominik Wieczorek", number: "7", photo: "dominik-wieczorek" },
    { name: "Artur Słodki", number: "77", photo: "artur-slodki" },
    { name: "Jan Rębecki", number: "9", photo: "jan-rebecki" },
    { name: "Antoni Sobieszek" },
    { name: "Iwo Sieradzki" },
    { name: "Kajtek Żołądkiewicz" },
    { name: "Michał Podgórski" },
    { name: "Sebastian Wyroda" },
  ],
  "rocznik-2013": [
    { name: "Artur Łapczyński", number: "11", photo: "artur-lapczynski" },
    { name: "Tymon Wielgosz", number: "12", photo: "tymon-wielgosz" },
    { name: "Oskar Kołodziejski", number: "14", photo: "oskar-kolodziejski" },
    { name: "Stanisław Łozicki", number: "15", photo: "stanislaw-lozicki" },
    { name: "Filip Przeradzki", number: "17", photo: "filip-przeradzki" },
    { name: "Aleksander Sokołowski", number: "18", photo: "aleksander-sokolowski" },
    { name: "Aleksander Wróblewski", number: "3", photo: "aleksander-wroblewski" },
    { name: "Wiktor Cieślak", number: "4", photo: "wiktor-cieslak" },
    { name: "Arkadiusz Bugaj", number: "6", photo: "arkadiusz-bugaj" },
    { name: "Antoni Baryłko", number: "7", photo: "antoni-barylko" },
    { name: "Stanisław Kejler", number: "8", photo: "stanislaw-kejler" },
    { name: "Antoni Mikoś", number: "80", photo: "antoni-mikos" },
    { name: "Kacper Kaczorek", number: "9", photo: "kacper-kaczorek" },
    { name: "Marcel Balcerowski", number: "9", photo: "marcel-balcerowski" },
  ],
  "rocznik-2014": [
    { name: "Banasiak Gustaw" },
    { name: "Bis Adam" },
    { name: "Bugaj Arkadiusz" },
    { name: "Gajos Aleksander" },
    { name: "Gaweł Leon" },
    { name: "Janicki Szymon" },
    { name: "Kejler Stanisław" },
    { name: "Kikowski Franciszek" },
    { name: "Kuligowski Maciej" },
    { name: "Kurkowski Kazimierz" },
    { name: "Michalski Jakub" },
    { name: "Mikoś Antoni" },
    { name: "Mordarski Tymoteusz" },
    { name: "Pstrągowski Tomasz" },
    { name: "Ptaszyński Jan" },
    { name: "Ramus Nikodem" },
    { name: "Sienicki Piotr" },
    { name: "Stachowiak Aleksander" },
    { name: "Stępień Oliwier" },
    { name: "Łapczyński Artur" },
  ],
  "rocznik-2015": [
    { name: "Dyminski Wojtek" },
    { name: "Głuszcz Kuba" },
    { name: "Komar Zlatan" },
    { name: "Nawrocki Jan" },
    { name: "Plich Staś" },
    { name: "Podskarbi Bartek" },
    { name: "Stachurski Franek" },
    { name: "Urbaniak Kacper" },
    { name: "Wieczorek Bronisław" },
    { name: "Wnuk Leon" },
    { name: "Woźniak Kajtek" },
    { name: "Zakharov Lev" },
    { name: "Zawiślak Adam" },
    { name: "Zbiciak Bartek" },
  ],
  "rocznik-2016": [
    { name: "Juszczuk Tymek" },
    { name: "Kamiński Bartosz" },
    { name: "Klimek Krzysztof" },
    { name: "Kopeć Franciszek" },
    { name: "Krysicki Wojtek" },
    { name: "Krzyżanowski Filip" },
    { name: "Kucharczuk Krystian" },
    { name: "Luściński Wiktor" },
    { name: "Pena-Osipuk Oliwier" },
    { name: "Pham Duc Duy Ahn" },
    { name: "Płaska Adam" },
    { name: "Łabanowicz Daniel" },
  ],
  "rocznik-2017": [],
  "rocznik-2018": [
    { name: "Marcel Kucharczuk", number: "1" },
    { name: "Krzysztof Owczarz", number: "11" },
    { name: "Stanisław Pęśko", number: "2", photo: "stanislaw-pesko" },
    { name: "Ignacy Kowalczyk-Tulacha", number: "10" },
    { name: "Krzysztof Wolszczak", number: "14" },
    { name: "Wiktor Sosnowski", number: "31" },
    { name: "Kacper Zielińska", number: "8" },
    { name: "Aleksander Jegierski", number: "9" },
    { name: "Mikołaj Komar", number: "13" },
  ],
  "rocznik-2019": [
    { name: "Wojtek Wróblewski", number: "10" },
    { name: "Chodosz Antoni", number: "5" },
    { name: "Witkowski Teodor" },
    { name: "Damian Jurczak", number: "7" },
  ],
  "rocznik-2020": [
    { name: "Szymon Nowak", number: "9" },
    { name: "Tarkowski Tadeusz" },
  ],
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
