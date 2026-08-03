# Dowiezienie integracji z Meta (posty z Facebooka) — design

Data: 2026-08-03
Status: do zatwierdzenia

## Cel

Strona RKS Okęcie ma pokazywać prawdziwe posty z fanpage'a
`rks.okeciewarszawa` zamiast lokalnych fallbacków. Kod synchronizacji
(Convex + Graph API) już istnieje — do dowiezienia jest konfiguracja
end-to-end oraz drobne wzmocnienie widoczności błędów synca.

## Kontekst — co już jest

- `convex/facebook/sync.ts` — pełny sync przez Graph API: pobiera 25
  ostatnich postów, zapisuje zdjęcia do Convex storage, kategoryzuje
  (mecz/trening/turniej/ogłoszenie/wydarzenie), taguje drużyny po slugu.
- `convex/crons.ts` — cron co 5 minut.
- `convex/feed.ts` — `getUnifiedFeed`, `getLatestFbPosts` dla frontendu.
- Frontend (`LatestFbPosts`, `FacebookFeedGrid`, `aktualnosci`) czyta
  z Convex, a bez `NEXT_PUBLIC_CONVEX_URL` pokazuje fallbacki.
- `src/app/admin/fb-posts/page.tsx` — statyczny placeholder.

## Wybrane podejście

Graph API z długożyjącym Page Access Tokenem (opcja A). Użytkownik jest
adminem fanpage'a, więc aplikacja Meta w trybie deweloperskim wystarczy —
bez App Review. Odrzucone: widget Page Plugin (łamie design, wyrzuca
istniejący kod), scraping HTML (ekran logowania, kruche).

## Zakres prac

### 1. Meta — aplikacja i token (wykonuje użytkownik, prowadzony krok po kroku)

1. Utworzenie aplikacji na developers.facebook.com (typ Business/Other).
2. W Graph API Explorer: user token z uprawnieniami
   `pages_show_list`, `pages_read_engagement`, `pages_read_user_content`.
3. Wymiana na długożyjący user token, a z niego pobranie Page Access
   Tokena (`/me/accounts`) — taki token strony w praktyce nie wygasa.
4. Token trafia bezpośrednio do env vars Convex (dashboard lub CLI po
   stronie użytkownika). Nigdy do repo ani do rozmowy.

### 2. Convex — provisioning i konfiguracja

1. `npx convex login` + `npx convex dev` (jednorazowe logowanie
   użytkownika; tworzy/podłącza deployment, generuje `.env.local`).
2. Env vars w Convex: `FB_PAGE_ID=rks.okeciewarszawa`,
   `FB_PAGE_ACCESS_TOKEN=<token>`, `FB_GRAPH_API_VERSION=v22.0`.
3. Deploy funkcji i crona na deployment produkcyjny (`npx convex deploy`).

### 3. Widoczność stanu synca (jedyna zmiana w kodzie)

Problem: gdy token wygaśnie/zostanie unieważniony, sync cicho zawodzi
i strona wraca na fallbacki bez śladu.

Rozwiązanie (minimalne, bez nowych tabel):

- `syncFromFacebook` po każdym przebiegu zapisuje wynik do istniejącej
  tabeli `settings` pod kluczem `fbSyncStatus` jako JSON:
  `{ ok, error?, created, updated, errors, at }`.
- Nowe query `facebook/sync:getSyncStatus` (publiczne) czyta ten wpis.
- `admin/fb-posts` pokazuje status ostatniego synca (kiedy, wynik, błąd)
  zamiast samego placeholdera. Bez rozbudowy o moderację — to poza
  zakresem.

### 4. Sync i weryfikacja

1. Ręczny sync: `npx convex run facebook/sync:triggerFacebookSync`.
2. Weryfikacja danych w Convex (posty, obrazy, kategorie).
3. Lokalny podgląd: `npm run dev` z `NEXT_PUBLIC_CONVEX_URL` —
   aktualności pokazują prawdziwe posty zamiast fallbacków.

### 5. Produkcja (Vercel)

1. Naprawa deployów: wg notatek deploye na koncie creativerebels są
   zablokowane (prywatne repo + author check); fix = re-import projektu
   na koncie gmail, potem usunięcie starego hooka (workflow już usunięty
   w `813c5a2`).
2. `NEXT_PUBLIC_CONVEX_URL` w env Vercela, redeploy.
3. Weryfikacja produkcji: prawdziwe posty na stronie głównej
   i w aktualnościach.

## Obsługa błędów

- Brak env vars → sync zwraca `success: false` z komunikatem (już jest).
- Błąd Graph API (w tym wygasły token) → zapis do `fbSyncStatus`,
  widoczny w admin/fb-posts.
- Frontend bez zmian: przy braku danych dalej pokazuje fallbacki.

## Testy / kryteria akceptacji

1. `npx convex run facebook/sync:triggerFacebookSync` zwraca
   `success: true` z `created > 0` przy pierwszym przebiegu.
2. Aktualności lokalnie i na produkcji renderują prawdziwe posty
   (treść, zdjęcia, linki do FB).
3. `admin/fb-posts` pokazuje datę i wynik ostatniego synca.
4. Cron wykonuje się automatycznie (widoczne kolejne `syncedAt`).

## Poza zakresem

- Moderacja postów w adminie (ukrywanie/przypinanie) — UI istnieje jako
  placeholder, funkcje odłożone.
- Instagram, Meta Pixel, publikowanie postów z poziomu strony.
- Automatyczne odświeżanie tokena (page token w praktyce nie wygasa;
  gdyby wygasł, admin pokaże błąd i token wymienia się ręcznie).
