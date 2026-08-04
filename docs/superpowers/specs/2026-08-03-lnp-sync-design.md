# Sync wyników i tabel z 90minut + virium, konfiguracja w adminie

Data: 2026-08-03 (zakres zrewidowany 2026-08-04)
Status: zaakceptowany w wersji okrojonej (brainstorming z Marcinem)
Branch bazowy: admin-panel

## WAŻNE: rewizja zakresu z 2026-08-04 — LNP odpada

Sonda API LNP przed implementacją wykazała, że **cały interfejs
`competition-api-pro.laczynaspilka.pl` jest chroniony reCAPTCHA**: frontend
najpierw wymienia token Google reCAPTCHA v3 na token dostępowy przez
`Authorize/recaptcha`, a bez tego **każdy** endpoint (mecze, tabele, słowniki,
szczegóły meczu) zwraca 401. Keycloak PZPN odrzuca `client_credentials` dla
klienta publicznego ("Public client not allowed to retrieve service account").
Test przez Firecrawl (renderowanie JS) zwrócił samą skorupę strony
z komunikatem "Recaptcha requires verification" — zero danych.

Automatyzacja wymagałaby obchodzenia mechanizmu wykrywania botów, czego **nie
robimy**. W konsekwencji:

- **Roczniki dziecięce: brak automatycznego źródła.** LNP jest ich jedynym
  wydawcą (MZPN wyłączył własne tabele), więc pozostaje ręczne wpisywanie
  w panelu admina.
- **Seniorzy i Seniorzy II: 90minut.pl** — publiczny statyczny HTML, bez
  captchy, z terminarzem i tabelą ligową.
- **Rocznik 2012: virium (RS Sport)** — bez zmian, ligi prywatne/zimowe.
- Cała warstwa sterowania (konfiguracja źródeł w adminie, przycisk syncu,
  przełącznik auto-syncu, tabela `standings`) zostaje bez zmian — jest
  niezależna od dostawcy danych.

Sekcje poniżej opisują docelowy stan **po** tej rewizji. Wszędzie, gdzie
pierwotnie było "LNP", źródłem jest teraz 90minut.

### Zweryfikowane źródła (stan na 2026-08-04)

| Drużyna | Źródło | Adres |
|---|---|---|
| Seniorzy | 90minut, Keeza Liga okręgowa 2026/2027 gr. Warszawa II | `http://www.90minut.pl/liga/1/liga14871.html` |
| Seniorzy II | 90minut, Keeza Klasa B 2026/2027 gr. Warszawa VII ("Okęcie II Warszawa") | `http://www.90minut.pl/liga/1/liga14945.html` |
| Rocznik 2012 | virium / RS Sport | `https://web.virium.pl/rssport/teams/03ea137c-d0e4-4739-be1b-d5d95fe28977` |

Adresy zmieniają się co sezon — dlatego trafiają do bazy przez panel, nie do kodu.

## Cel

Maksymalne automatyczne pokrycie drużyn RKS Okęcie (seniorzy + roczniki dziecięce)
danymi meczowymi: terminarze, wyniki i tabele ligowe. Zarządzanie źródłami i syncem
z panelu admina, bez deployów i bez ręcznego grzebania w env vars.

## Kontekst i ustalenia z researchu

- Stary serwis (Drupal, rksokecie.pl) nie miał integracji: tabele i wyniki były
  ręcznie wklejanym HTML-em skopiowanym z 90minut.pl.
- MZPN zlikwidował własne tabele (`mzpn.pl/rozgrywki/tabele-i-terminarze/?play_id=…`
  zwraca pusty dokument — stąd `fetchable: false` w obecnym kodzie) i odsyła do
  laczynaspilka.pl / aplikacji mPZPN.
- Dla lig dziecięcych MZPN **nie istnieje żadne alternatywne źródło**: 90minut
  i regionalnyfutbol pokrywają tylko seniorów/CLJ, klubowe futbolowo jest martwe
  (ostatni rocznik młodzieżowy: 1999).
- Oficjalne API LNP odpada (długi proces partnerski — decyzja Marcina). Korzystamy
  nieoficjalnie z publicznego API frontendu LNP
  (`competition-api-pro.laczynaspilka.pl/api/bus/competition/v1/`), tego samego,
  które odpytuje ich strona. Ryzyko: może się psuć przy zmianach frontendu
  (rotacja tokenu); akceptowane, z automatyczną odnową tokenu i ręczną furtką.
- Ligi prywatne/zimowe (RS Sport na web.virium.pl) nie są rozgrywkami PZPN — nie ma
  ich w LNP. Virium zostaje jedynym źródłem tych meczów (dziś: rocznik 2012).
- 90minut.pl ostatecznie niepotrzebny (pierwotny pomysł zarzucony po researchu):
  LNP daje wyniki + terminarze + tabele dla wszystkich drużyn z jednego źródła.

## Decyzje (zatwierdzone)

1. Roczniki: dane z publicznego API LNP (nieoficjalnie); panel admina jako ręczna
   furtka awaryjna (CRUD meczów już istnieje).
2. Tabele ligowe: z LNP, dla wszystkich drużyn (seniorzy i roczniki). Bez 90minut.
3. Źródła: virium zostaje (port do Convex), regionalnyfutbol + futbolowo +
   duplikat `/api/rks-matches` do wygaszenia.
4. Admin: przycisk "Synchronizuj teraz" + przełącznik auto-syncu; cron co 6 h
   sprawdza flagę.
5. Konfiguracja źródeł per drużyna w bazie (edycja w `/admin/druzyny` przez
   wklejenie linku), nie w env vars. Zmiana sezonu = wklejenie nowego linku.

## Model danych (Convex)

Nowe tabele; `matches` bez zmian strukturalnych.

### `syncSources`

Jedna drużyna może mieć wiele źródeł (liga + puchar + liga zimowa).

- `teamId: Id<"teams">`
- `kind: "ninetyminut" | "virium"`
- `url: string` — link wklejony przez admina (strona ligi / drużyny)
- `externalId: string` — wyciągnięty z URL-a (id ligi 90minut, np. `14871`;
  uuid drużyny virium)
- `teamNameOnSource: string` — nazwa naszej drużyny u źródła (np.
  `Okęcie Warszawa` vs `Okęcie II Warszawa`); wykrywana automatycznie przy
  dodawaniu źródła, edytowalna ręcznie. Rozstrzyga, które mecze z ligi są nasze.
- `matchType: "liga" | "sparing" | "turniej" | "puchar"`
- `enabled: boolean`
- `lastSyncedAt?: number`, `lastError?: string` — status ostatniego przebiegu
- indeks: `by_team`

### `standings`

Jeden dokument na ligę drużyny, podmieniany w całości przy syncu.

- `teamId: Id<"teams">` — czyja to liga
- `competitionName: string`, `season: string`
- `rows: Array<{ position, name, played, points, wins, draws, losses,
  goalsFor, goalsAgainst, isRks }>`
- `syncedAt: number`, `sourceUrl?: string`
- indeks: `by_team`

### `appSettings`

Key-value: `key: string` (indeks `by_key`), `value` (union prostych typów).
Klucz na start: `autoSyncEnabled: boolean`. (Token LNP odpadł wraz z LNP.)

### `matches` — kompatybilność wstecz

Walidator `source` zachowuje wartości `lnp`, `regionalnyfutbol` i `futbolowo` —
historyczne dokumenty zostają bez migracji, po prostu przestają być zasilane —
i zyskuje `ninetyminut`. Mecze `manual` nietknięte.

## Przepływ syncu

`syncAll` (internalAction):

1. Czyta włączone `syncSources` + token z `appSettings`.
2. Dla każdego źródła (osobny try/catch — awaria jednego nie blokuje reszty):
   - 90minut: pobiera stronę ligi (HTML w ISO-8859-2), parsuje tabelę ligową
     i wszystkie kolejki, zostawia mecze z udziałem `teamNameOnSource`.
   - virium: pobiera mecze przez `__NEXT_DATA__` (logika portowana
     z `/api/rks-matches`); virium nie dostarcza tabeli.
   - Upsert meczów po `sourceMatchId` istniejącą ścieżką `upsertFromSource`.
   - Podmiana dokumentu `standings` — tylko przy poprawnym, niepustym parsie
     (zły fetch nie kasuje dobrej tabeli).
   - Zapis `lastSyncedAt` / `lastError` na źródle.
3. Wyzwalacze: cron co 6 h (najpierw sprawdza `autoSyncEnabled`) oraz
   admin-gated akcja z panelu (zwraca podsumowanie per źródło).

### Klucz meczu i daty (90minut)

`sourceMatchId` = `90minut:<idLigi>:<home>-<away>` na znormalizowanych nazwach —
stabilny niezależnie od tego, czy mecz jest już rozegrany (90minut dokłada link
do LNP dopiero po meczu, więc klucz nie może z niego korzystać).

Daty na 90minut nie zawierają roku ("9 sierpnia, 11:00"). Rok wyliczamy
z sezonu w nagłówku ligi: miesiące VII–XII → pierwszy rok sezonu, I–VI → drugi.
Godzinę przeliczamy na UTC z uwzględnieniem polskiego czasu letniego/zimowego
(nie stałym offsetem +02:00, jak robi obecny kod — to psuje mecze zimowe).

## Panel admina

- `/admin/druzyny`: sekcja "Źródła danych" przy drużynie — dodanie źródła przez
  wklejenie linku (system rozpoznaje 90minut/virium, wyciąga ID i próbuje sam
  ustalić `teamNameOnSource`), włącz/wyłącz, usuń, widoczna data ostatniego
  syncu i ewentualny błąd.
- `/admin/mecze`: przycisk "Synchronizuj teraz" (z podsumowaniem per źródło),
  przełącznik auto-syncu, status ostatniej synchronizacji.

## Strona publiczna

- `/wyniki`: zakładki drużyn z bazy (moduł druzyny) zamiast pliku
  `matchSources.ts`. Zakładkę dostaje drużyna, która ma co najmniej jedno
  źródło w `syncSources` lub co najmniej jeden mecz w bazie; kolejność wg
  kolejności drużyn w module admina. Przy wybranej drużynie sekcja "Tabela"
  z podświetlonym wierszem Okęcia (flaga `isRks`).
- Strona główna: bez zmian układu (ten sam `MatchCenter`).

## Sprzątanie

Wypadają: scrapery regionalnyfutbol i futbolowo z `convex/matchesSync.ts`
(w tym ich env-varowe parsery konfiguracji), endpoint
`src/app/api/rks-matches/route.ts` z całą zdublowaną logiką parserów, rejestr
`src/data/matchSources.ts`, fallbackowy `PublicMatchCenter`. Nieużywana ścieżka
`upsertFromLnp` (legacy) też do usunięcia — żywa pozostaje `upsertFromSource`.

## Obsługa błędów

- Izolacja per źródło; błędy widoczne w adminie przy źródle.
- Standings: podmiana tylko przy niepustym parsie.
- Mecze: upsert tylko wierszy sparsowanych w całości.
- Sync nigdy nie rzuca całością — częściowy sukces jest raportowany.

## Testy

- `convex-test`: upsert meczów, podmiana standings, respektowanie flagi
  `autoSyncEnabled`, odczyt/zapis `appSettings`, CRUD `syncSources`.
- Parsery: testy jednostkowe na zapisanych w repo próbkach HTML (90minut —
  sezon rozegrany i sezon świeży; virium — `__NEXT_DATA__`).
- E2E ręcznie na dev-deploymencie: przycisk w adminie → weryfikacja `/wyniki`
  (mecze + tabela).

## Ryzyka i niewiadome

- 90minut to scrape HTML-a: zmiana ich szablonu psuje parser. Mityguje to
  izolacja per źródło (`lastError` w panelu) i to, że tabela nie jest
  podmieniana przy pustym parsie.
- Strona 90minut chodzi po HTTP i w ISO-8859-2 — dekodowanie robimy własną
  tablicą znaków, bez polegania na ICU w runtime Convexa.
- ID lig zmieniają się co sezon — obsłużone przez wklejenie nowego linku
  w adminie (bez deployu).
- Roczniki dziecięce pozostają ręczne, dopóki nie pojawi się legalne źródło
  (oficjalny dostęp do LNP albo inny wydawca danych MZPN).

## Poza zakresem

- `matchEvents` (strzelcy, kartki) — tabela istnieje w schemacie, nie ruszamy.
- Automatyczne wykrywanie nowego sezonu / nowych lig.
- Powiadomienia o wynikach, statystyki zawodników.
- Jakakolwiek forma obchodzenia reCAPTCHA na laczynaspilka.pl.
