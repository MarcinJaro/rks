# Finalizacja strony na 1.09 - stan i braki

Dokument powstał przy realizacji feedbacku klienta z 25 sierpnia 2026.
Zawiera to, co zostało zrobione, oraz konkretne pytania i czynności, bez
których strona nie jest gotowa do cutoveru.

## Co zostało wdrożone

| Punkt klienta | Gdzie |
|---|---|
| 1. Sklep + stroje meczowe | `/zawodnik/stroje` |
| 2.1 Treningi bramkarskie | `/zawodnik/treningi-bramkarskie` |
| 2.2 Treningi indywidualne | `/zawodnik/treningi-indywidualne` |
| 2. Zakładka „Zawodnik" | sekcja `/zawodnik` z podnawigacją, wchłonęła `/rodzice` |
| 3. Usunięcie kadr młodzieżowych | `src/data/roster.ts` + `public/images/players/` |
| 3. Samodzielne wpisywanie kadr | `/admin/kadry` (tabela `players` w Convex) |
| 4. Akceptacja regulaminu | `/zawodnik/regulamin` + `/admin/regulamin` |
| 5. Rozbudowany opis rekrutacji | `/zawodnik` |

Dodatkowo naprawiony formularz kontaktowy (`/kontakt`), który wcześniej nie
wysyłał wiadomości nigdzie, oraz uzupełniona polityka prywatności o nowy
proces przetwarzania danych.

## Pytania do klienta - ROZSTRZYGNIĘTE 2026-08-28

1. **Skład kompletu za 320 zł** - edytowalne w panelu: Ustawienia → „Stroje
   meczowe" (cena, skład, e-mail zamówień). Strona `/zawodnik/stroje` czyta
   te wartości z Convex, puste pole = wartość domyślna.
2. **`stroje@rksokecie.pl`** - zakładamy, że działa (adres podał klient).
3. **Pisownia** - „Football Tigers Center" (poprawna, tak zostaje).
4. **Próg wieku naboru** - liczony z sezonu (`src/lib/season.ts`):
   1 lipca próg przesuwa się o rok. Sezon 2025/26 → ur. 2013, sezon
   2026/27 → ur. 2014. Strona `/zawodnik` odświeża się raz na dobę.
5. **PESEL w formularzu regulaminu** - jak na starej stronie: PESEL
   zawodnika i opiekuna, wymagane, walidacja 11 cyfr + suma kontrolna.
   Deduplikacja zgód po PESEL-u dziecka. Kolumny w panelu i CSV,
   polityka prywatności zaktualizowana.
6. **Zdjęcia pozostałych drużyn** - póki co BEZ modułu w adminie;
   dosyłane zdjęcia wgrywamy pipeline'em `scripts/generate-camp-cards.mjs`.

## Znalezione na starej stronie (już wykorzystane)

- Formularz zgłoszeniowy to ProTrainUp:
  `https://rksokecie.protrainup.com/pl/forms/351?signature=f8cba…` (zweryfikowany, HTTP 200).
- Stary `/akceptacja-regulaminu` przekierowuje teraz na `/zawodnik/regulamin`
  zamiast lądować w `/aktualnosci`.
- `deklaracja_gry_amatora_2026-27_2.pdf` ze starego serwisu jest bajt w bajt
  identyczny z lokalnym `public/documents/deklaracja-gry-amatora.pdf`.

## Czynności wdrożeniowe przed cutoverem

1. **Convex prod - zmienna ADMIN_EMAILS.** Bez niej `/admin/regulamin` odmawia
   dostępu (celowo - to dane osobowe rodziców i dzieci):
   ```
   npx convex env set ADMIN_EMAILS "adres@klubu.pl,drugi@klubu.pl" --prod
   ```
   Na dev jest już ustawiona.
2. **Clerk - claim `email` w szablonie JWT „convex".** Dodany na instancji
   deweloperskiej. Jeśli produkcja używa osobnej instancji Clerka, trzeba tam
   dodać `"email": "{{user.primary_email_address}}"` do szablonu, inaczej
   lista dostępowa nie zadziała.
3. **Deploy Convex na prod** (`npx convex deploy`) - dochodzą tabele
   `players` i `regulationAcceptances`.
4. **Rekord testowy.** Na dev w `regulationAcceptances` jest jedna zgoda
   „Jan Testowy" - służy do sprawdzenia panelu i eksportu CSV, można ją
   usunąć z `/admin/regulamin`.

## Znane długi techniczne

- **Publiczna mutacja `regulations.accept` nie ma limitowania zapytań.**
  Powtórne zgłoszenie dla tego samego dziecka aktualizuje istniejący wpis
  (deduplikacja), więc rodzina nie nabije duplikatów, ale zdeterminowany
  spamer może wstawiać zmyślone nazwiska. Docelowo `@convex-dev/rate-limiter`.
- **`requireAdmin` wpuszcza każdą zalogowaną tożsamość Clerka.** Dane osobowe
  są dodatkowo chronione listą `ADMIN_EMAILS`, ale reszta panelu (mecze,
  dokumenty, kadry) nadal opiera się na samym fakcie zalogowania.
- **Kolor `--secondary` (#4a80bc) jest nieczytelny na niebieskich tłach**
  (kontrast 1,3-1,8:1). W nowych widokach zastąpiony, ale zostaje jeszcze
  w `src/app/kontakt/page.tsx` (ikony), `src/components/admin/FileUpload.tsx`
  i wariancie `secondary` w `src/components/ui/button.tsx`.
- **Treść stron jest w kodzie** (`src/data/zawodnik.ts`, `src/data/legacy.ts`),
  więc każda korekta ceny czy telefonu wymaga deployu.

## Audyt panelu admina 2026-08-28 (workflow: 9 modułów → weryfikacja adwersaryjna)

### Naprawione i pokryte testami

- **[CRITICAL] Otwarty panel admina.** `requireAdmin` (convex/adminAuth.ts)
  wpuszczał KAŻDE zalogowane konto Clerka, a instancja ma otwartą rejestrację
  (self-service + Google). Dowolny anonim mógł zarejestrować się i wołać
  funkcje panelu bezpośrednio przez klienta Convex (kasować mecze, drużyny,
  zawodników, zmieniać ustawienia). NAPRAWA: `requireAdmin` egzekwuje teraz
  listę `ADMIN_EMAILS` (fail-closed) - dotyczy całego panelu naraz.
  **Warunek wdrożenia na prod:** ustawić `ADMIN_EMAILS` + claim `email` w JWT
  Clerka, inaczej panel jest zamknięty (to celowe).
- **[HIGH] removeTeam nie kaskadował.** Usunięcie drużyny zostawiało
  zawodników (ze zdjęciami dzieci w storage), źródła synchronizacji, standings
  i mecze - a cron co 6 h „wskrzeszał" dane. NAPRAWA: kaskada w removeTeam
  (kasuje players+zdjęcia, źródła, standings; mecze ręczne kasuje, sync odpina).
- **[HIGH] syncSources.remove** zostawiał osieroconą tabelę ligową widoczną
  publicznie. NAPRAWA: kaskada na standings.
- **[HIGH] Sync nadpisywał ręczne poprawki meczu** (wpisany wynik/status/data
  ginęły przy kolejnym sync). NAPRAWA: pole `manualFields` - ręcznie zmienione
  pola są chronione przed nadpisaniem ze źródła (per-pole, wykrywane po zmianie).
- **[HIGH] regulations.accept** nadpisywał cudzą zgodę (dowód prawny) przy tym
  samym PESEL-u dziecka. NAPRAWA: inny e-mail rodzica = nowy wpis „sporny",
  oryginał nietknięty.
- **[HIGH] Usuwanie zgody bez potwierdzenia.** NAPRAWA: window.confirm z nazwą
  dziecka.
- **[MEDIUM] Komunikaty walidacji** (PESEL itd.) ginęły na prod („Server
  Error"). NAPRAWA: ConvexError + helper `errorMessage` na kliencie.
- **[MEDIUM] Podwójny import kadry** tworzył duplikaty. NAPRAWA: blokada
  przycisków na czas mutacji w /admin/kadry.
- **[LOW] Parser importu** łykał nagłówki („Bramkarze:", „Rocznik 2015") jako
  zawodników. NAPRAWA: filtr liter/dwukropka/nagłówka rocznik.
- **[LOW] Posty FB** poza nawigacją. NAPRAWA: dodane do menu panelu.
- Backend matches.update przyjmuje teraz `dateConfirmed`/`roundLabel`
  (potwierdzenie orientacyjnego terminu ze źródła).

### Dług z audytu - DOMKNIĘTY 2026-08-29

Wszystkie pozycje z listy długu zostały naprawione:

- **Artykuły** (/admin/articles): pełny CRUD - lista ze statusami, formularz
  (tytuł, slug auto-generowany, zajawka, kategoria, drużyna, treść z bezpieczną
  konwersją do HTML, status, data publikacji, zdjęcie główne, YouTube),
  usuwanie z kaskadą na pliki. Dodane do nawigacji panelu.
- **Posty FB** (/admin/fb-posts): moderacja - ukrywanie/przypinanie,
  kategorie i przypisanie do drużyn, filtr ukrytych.
- **Formularz meczu**: checkbox „Termin potwierdzony" + opis kolejki
  (roundLabel); ręczna zmiana daty automatycznie potwierdza termin; plakietka
  „termin orientacyjny" na liście. Zapis edycji wysyła TYLKO zmienione pola
  (diff od snapshotu) - nie nadpisuje danych dogranych przez sync.
- **Usuwanie zdjęć**: formularze kadr, ludzi i drużyn pokazują miniaturę
  aktualnego zdjęcia z przyciskiem „Usuń zdjęcie" (photoStorageId:
  null → backend kasuje plik). Kluczowe przy cofnięciu zgody na wizerunek.
- **Porzucone uploady**: mutacja files.removeUpload + sprzątanie przy
  Anuluj/podmianie we wszystkich formularzach z plikami (kadry, ludzie,
  drużyny, sponsorzy, galerie, dokumenty, artykuły). FileUpload przy błędzie
  w środku serii oddaje ID plików już wysłanych zamiast je gubić.
- **Ciche błędy**: wszystkie fire-and-forget mutacje (reorder/remove w
  druzyny, ludzie, kadry, sponsorzy, galerie, live) objęte try/catch
  z komunikatem w UI (helper errorMessage, ConvexError-aware).
- **Podwójne zapisy**: blokady busy na przyciskach zapisu we wszystkich
  formularzach panelu.
- **Duplikaty źródeł sync**: syncSources.add odrzuca to samo źródło dla tej
  samej drużyny (i tę samą nazwę drużyny u innej); TeamSources pozwala
  edytować nazwę/typ źródła bez kasowania.
- **Transmisje live**: „Zapisz przy meczu" działa też dla transmisji bez
  powiązania (select meczu); nadpisanie istniejącego linku wymaga
  potwierdzenia; lista zawsze pokazuje aktywne transmisje (nie wypadają
  z okna 20).
- **Dokumenty**: podmiana PDF-a w edycji (stary plik kasowany).
- **Galerie**: data bez przesunięcia UTC (strefa lokalna).
- **Puste centrum meczowe**: wyłączone źródła nie tworzą już pustych zakładek.
- **AppProviders**: przy braku NEXT_PUBLIC_CONVEX_URL trasa /admin pokazuje
  jawny komunikat konfiguracyjny zamiast krachu.
