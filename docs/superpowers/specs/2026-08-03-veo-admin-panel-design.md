# Panel administracyjny RKS Okęcie + integracja wideo VEO/YouTube

Data: 2026-08-03
Status: zatwierdzony w rozmowie, do przeglądu spisanej wersji

## Cel

Zbudować działający panel administracyjny dla strony rks-okecie.pl (obecnie `/admin` to
puste strony-wydmuszki bez logowania) oraz umożliwić pokazywanie meczów **na żywo** i
nagrań VEO na stronie publicznej.

## Kontekst i ustalenia

- Stack: Next.js 16 (App Router, Turbopack) + React 19 + Convex (baza, storage, crony)
  + Tailwind 4, deploy na Vercel.
- Schemat Convex już istnieje i pokrywa wszystkie typy treści (`matches`, `teams`,
  `people`, `sponsors`, `galleries`, `documents`, `pages`, `settings`, `articles`,
  `fbPosts`). Publiczne strony już czytają te tabele.
- **VEO API jest dostępne wyłącznie dla zaproszonych partnerów integracyjnych**
  (api.veo.co) — bezpośrednia integracja API jest na dziś niemożliwa. Klub może
  wystąpić o dostęp partnerski niezależnie od tej pracy.
- Klub już dziś streamuje transmisje VEO na YouTube. Decyzja: **live przez osadzony
  player YouTube**, sterowany z panelu admina. Struktura danych ma być gotowa na
  późniejsze podpięcie VEO API bez zmiany schematu.
- Logowanie: **Clerk** (publiczna rejestracja wyłączona, admini zapraszani z dashboardu
  Clerk; 2–3 administratorów).
- Zakres v1 (decyzja użytkownika): Mecze + Live/VEO, Klub (drużyny/ludzie/sponsorzy),
  Pozostałe (galerie/dokumenty/ustawienia). **Poza zakresem v1:** artykuły i moderacja
  postów FB (sync FB działa automatycznie w tle; istniejące strony-wydmuszki zostają).

## Architektura (podejście A — zatwierdzone)

Panel pozostaje częścią istniejącej aplikacji Next.js pod `/admin`. Jeden deploy,
wspólny design system. Odrzucone alternatywy: osobna aplikacja admina (podwójne
utrzymanie), gotowe narzędzie typu Retool/Convex dashboard (zły UX dla nietechnicznych
adminów, brak polskiego UI, brak flow „włącz transmisję").

### Uwierzytelnianie — podwójna warstwa

1. `@clerk/nextjs` + `middleware.ts` chroni wszystkie ścieżki `/admin` — niezalogowany
   użytkownik trafia na stronę logowania (`/admin/sign-in`).
2. Provider Convex zmienia się na `ConvexProviderWithClerk`; Convex dostaje
   `auth.config.ts` z domeną issuera Clerk. **Każda mutacja administracyjna w Convex
   sprawdza `ctx.auth.getUserIdentity()` i odrzuca wywołania bez tożsamości** — ochrona
   działa na backendzie, nie tylko w UI (API Convex jest publicznie osiągalne).
3. W Clerk publiczna rejestracja wyłączona (tryb invite-only z dashboardu).

Nowe zmienne środowiskowe: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`,
domena issuera JWT dla Convex.

### Layout panelu

`src/app/admin/layout.tsx`: boczna nawigacja (Mecze, Live, Drużyny, Ludzie, Sponsorzy,
Galerie, Dokumenty, Ustawienia), nagłówek z nazwą zalogowanego admina i wylogowaniem.
Całość po polsku, na istniejących komponentach (Tailwind, `button.tsx`, `PageHeader`).

## Moduł Mecze + Live/VEO

### Zmiany w schemacie

- `matches`: nowe pola `veoUrl: v.optional(v.string())` i
  `youtubeUrl: v.optional(v.string())`.
- Nowa tabela `liveStreams`:
  - `title: v.string()`
  - `youtubeUrl: v.string()`
  - `matchId: v.optional(v.id("matches"))`
  - `status: v.union(v.literal("scheduled"), v.literal("live"), v.literal("ended"))`
  - `startsAt: v.optional(v.number())`
  - `endedAt: v.optional(v.number())`
  - indeks po `status`.

### Flow admina w dniu meczu

1. Klub startuje transmisję VEO → YouTube (istniejący proces, bez zmian).
2. Admin w panelu wkleja link YT, widzi **podgląd playera w panelu** (walidacja linku
   przed publikacją), klika „Rozpocznij transmisję".
3. Strona główna automatycznie pokazuje sekcję **MECZ LIVE** z osadzonym playerem
   YouTube (query Convex po `status = "live"` — reaktywnie, bez redeployu).
4. Po meczu admin klika „Zakończ" — sekcja znika; link można jednym kliknięciem
   zapisać w powiązanym meczu jako `youtubeUrl` (archiwum).

### Zarządzanie meczami

- Lista meczów z filtrami (drużyna, status) i oznaczeniem źródła (ręczny / sync z lig).
- Ręczne dodawanie i edycja meczu: rywal, data, miejsce, typ, drużyna, wynik.
- Pola linków `veoUrl` i `youtubeUrl` w formularzu meczu.
- Publiczna strona `wyniki`: przy meczu przyciski „▶ Nagranie VEO" / „▶ YouTube",
  gdy linki ustawione.

### Gotowość na VEO API

Pola `veoUrl` na meczach i tabela `liveStreams` są zaprojektowane tak, by przyszły job
synchronizacji z VEO API (gdy klub uzyska status partnera) wypełniał te same pola —
bez migracji schematu i bez zmian w UI.

## Moduły Klub: drużyny, ludzie, sponsorzy

Wspólny wzorzec CRUD: lista z wyszukiwaniem → formularz dodawania/edycji → usuwanie
z potwierdzeniem.

- **Drużyny:** nazwa, rocznik, liga, opis, harmonogram treningów, zdjęcie grupowe
  (upload do Convex storage z podglądem), trener (wybór z `people`), przełącznik
  aktywności, kolejność (strzałki góra/dół na liście).
- **Ludzie:** imię i nazwisko, rola (trener/zarząd/legenda/zasłużony), stanowisko,
  zdjęcie, przypisanie do drużyny, kwalifikacje, bio, kolejność.
- **Sponsorzy:** nazwa, logo (upload, wymagane), link, typ (sponsor/partner), kolejność.

Publiczne strony już czytają te tabele — zmiany widoczne natychmiast.

## Galerie, dokumenty, ustawienia

- **Galerie:** tytuł, data, opis, drużyna, upload wielu zdjęć naraz (drag & drop),
  usuwanie pojedynczych zdjęć, zmiana kolejności.
- **Dokumenty:** tytuł, kategoria, upload PDF; zasila `klub/dokumenty`.
- **Ustawienia:** formularz klucz-wartość na tabeli `settings` (dane kontaktowe, linki
  społecznościowe itd.).

## Obsługa błędów

- Mutacje Convex walidują dane wejściowe i tożsamość; błędy wracają do formularza jako
  czytelny polski komunikat (toast), bez utraty wpisanych danych.
- Upload: walidacja typu (obrazy/PDF) i rozmiaru przed wysyłką, wskaźnik postępu.
- Live: podgląd playera w panelu przed publikacją — zepsuty link nie wychodzi na
  stronę główną.

## Weryfikacja

- `npm run typecheck` + `npm run lint` po każdym etapie.
- Ręczne przejście w przeglądarce przed uznaniem etapu za skończony: logowanie
  (w tym odmowa dostępu bez logowania), każdy CRUD, pełny flow live (start → sekcja
  na stronie głównej → koniec → archiwum przy meczu).

## Kolejność wdrożenia (wysokopoziomowo)

1. Clerk: instalacja, middleware, provider, invite-only, zabezpieczenie mutacji Convex.
2. Layout panelu + nawigacja.
3. Moduł Live + zmiany schematu + sekcja MECZ LIVE na stronie głównej.
4. Moduł Mecze (lista, CRUD, linki wideo, przyciski na stronie `wyniki`).
5. Drużyny, Ludzie, Sponsorzy.
6. Galerie, Dokumenty, Ustawienia.

Szczegółowy plan implementacji powstanie osobno (writing-plans).
