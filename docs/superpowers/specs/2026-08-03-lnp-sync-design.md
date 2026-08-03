# Sync wyników i tabel z LNP + virium, konfiguracja w adminie

Data: 2026-08-03
Status: zaakceptowany (brainstorming z Marcinem)
Branch bazowy: admin-panel

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
- `kind: "lnp" | "virium"`
- `url: string` — link wklejony przez admina (strona drużyny/rozgrywek)
- wyekstrahowane identyfikatory (opcjonalne, zależne od `kind`):
  `lnpTeamId`, `lnpPlayId`, `viriumTeamId`, `viriumCompetitionId`
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
Klucze na start: `autoSyncEnabled: boolean`, `lnpToken: string`,
`lnpTokenUpdatedAt: number`.

### `matches` — kompatybilność wstecz

Walidator `source` zachowuje wartości `regionalnyfutbol` i `futbolowo` —
historyczne dokumenty zostają bez migracji, po prostu przestają być zasilane.
Mecze `manual` nietknięte.

## Przepływ syncu

`syncAll` (internalAction):

1. Czyta włączone `syncSources` + token z `appSettings`.
2. Dla każdego źródła (osobny try/catch — awaria jednego nie blokuje reszty):
   - LNP: pobiera mecze rozegrane + nierozegrane oraz tabelę ligi.
   - virium: pobiera mecze i (jeśli dostępna) tabelę przez `__NEXT_DATA__`
     (logika portowana z `/api/rks-matches`).
   - Upsert meczów po `sourceMatchId` istniejącą ścieżką `upsertFromSource`.
   - Podmiana dokumentu `standings` — tylko przy poprawnym, niepustym parsie
     (zły fetch nie kasuje dobrej tabeli).
   - Zapis `lastSyncedAt` / `lastError` na źródle.
3. Wyzwalacze: cron co 6 h (najpierw sprawdza `autoSyncEnabled`) oraz
   admin-gated akcja z panelu (zwraca podsumowanie per źródło).

### Token LNP

Przechowywany w `appSettings`. Przy 401: akcja pobiera bundle frontendu LNP,
wyciąga świeży token, zapisuje, ponawia raz. Jak i to zawiedzie — błąd trafia do
`lastError`, a admin może wkleić token ręcznie w panelu.

## Panel admina

- `/admin/druzyny`: sekcja "Źródła danych" przy drużynie — dodanie źródła przez
  wklejenie linku (system rozpoznaje LNP/virium i wyciąga ID), włącz/wyłącz,
  usuń, widoczna data ostatniego syncu i ewentualny błąd.
- `/admin/mecze`: przycisk "Synchronizuj teraz" (z podsumowaniem per źródło),
  przełącznik auto-syncu, status ostatniej synchronizacji, awaryjne pole na
  ręczny token LNP.

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
  `autoSyncEnabled`, odczyt/zapis `appSettings`.
- Parsery: testy jednostkowe na nagranych próbkach odpowiedzi LNP i virium
  (nagranie próbek na starcie implementacji).
- E2E ręcznie na dev-deploymencie: przycisk w adminie → weryfikacja `/wyniki`
  (mecze + tabela).

## Ryzyka i niewiadome

- Kształt endpointu tabel LNP nieznany w szczegółach — pierwszy krok
  implementacji to sonda/nagranie odpowiedzi API (frontend LNP dowodzi, że
  endpoint istnieje). Projekt tego nie przesądza.
- Sposób osadzenia tokenu w bundle LNP może się zmieniać — stąd trójstopniowa
  strategia (cache → auto-ekstrakcja → ręczne wklejenie).
- ID rozgrywek zmieniają się co sezon — obsłużone przez wklejenie nowego linku
  w adminie (bez deployu).

## Poza zakresem

- `matchEvents` (strzelcy, kartki) — tabela istnieje w schemacie, nie ruszamy.
- Automatyczne wykrywanie nowego sezonu / nowych drużyn na LNP.
- Powiadomienia o wynikach, statystyki zawodników.
