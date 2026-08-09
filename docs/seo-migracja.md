# Migracja SEO: stary Drupal → nowa strona (rksokecie.pl)

Stan na 2026-08-10. Cel: zero strat w Google przy przełączeniu DNS na nową stronę.

## Co zbadano

- **Sitemapa starego serwisu** (`https://rksokecie.pl/sitemap.xml`, Drupal): **1610 URL-i**.
  Kopia robocza: sitemapa była pobrana i przeanalizowana w całości.
- **robots.txt** starego serwisu: standardowy Drupal (blokuje /admin, /user itd. — nic, co wymaga odwzorowania).
- **Indeks wyszukiwarek** (próbka site:rksokecie.pl): zaindeksowane m.in. strona główna,
  /aktualnosci, /kontakt, /zarzad-klubu, /dla-rodzicow, /strefa-kibica/kalendarz-sportowy,
  świeże artykuły meczowe z sekcji /seniorzy-liga-okregowa/ oraz ścieżki spoza sitemapy
  (/sekcja/..., /node/...).

## Struktura starego serwisu (1610 URL-i)

| Sekcja | Liczba | Nowy cel przekierowania |
|---|---|---|
| /seniorzy-liga-okregowa/, /seniorzy-a-klasa/, /seniorzy-v-liga/, /seniorzy-iv-liga/ | ~644 | /druzyny/seniorzy |
| /seniorzy-ii-b-klasa/ | 15 | /druzyny/seniorzy2 |
| /rocznik-*/ (z aktualną drużyną: 2010, 2012–2020 + warianty a/b, „i młodsi", łączone) | ~350 | /druzyny/rocznik-XXXX |
| /rocznik-*/ (bez aktualnej drużyny: 2001, 2004–2009, 2011 itd.) | ~380 | /druzyny |
| /oldboy/, /oldboye/, /oldboy-weterani/ | ~30 | /druzyny/oldboy |
| /strefa-kibica/* | 10 | /kibice (+ mapowania szczegółowe) |
| Strony statyczne (kontakt, historia, stadion, zarząd, sztab, NIW, …) | ~15 | odpowiedniki 1:1 lub /klub/* |
| Artykuły z poziomu głównego | ~163 | /aktualnosci, nabory/obozy → /rodzice, 1,5% → /wspieraj |
| /sekcja/*, /node/* | 2+ | /aktualnosci |

## Co wdrożono

1. **Przekierowania 301 (technicznie 308)** — [next.config.ts](../next.config.ts) +
   wygenerowana mapa [src/data/legacy-redirects.ts](../src/data/legacy-redirects.ts).
2. **Canonical na każdej stronie** ([src/app/layout.tsx](../src/app/layout.tsx),
   `alternates.canonical`) — chroni przed duplikacją indeksu przez domenę *.vercel.app.
3. **Sitemapa i robots nowej strony** już istniały ([src/app/sitemap.ts](../src/app/sitemap.ts),
   [src/app/robots.ts](../src/app/robots.ts)) — wskazują na https://rksokecie.pl.

**Wynik testu pokrycia** (wszystkie 1609 unikalnych URL-i starej sitemapy odpytane na dev,
2026-08-10): 1606 × przekierowanie 308 na właściwą stronę, 3 × 200 (ścieżki istniejące 1:1:
`/`, `/aktualnosci`, `/kontakt`), **0 × 404**.

## Migracja treści (2026-08-10)

- **46 artykułów sezonu 2025/26** (2025-07-13 → 2026-06-16) przeniesione ze starego
  Drupala do tabeli `articles` w Convex (dev + prod) skryptem
  [scripts/import-legacy-articles.mjs](../scripts/import-legacy-articles.mjs):
  treść HTML oczyszczona, zdjęcia hero + inline + galerie (limit 16/artykuł) wgrane do
  Convex storage. Stare adresy tych artykułów przekierowują **1:1** na
  `/aktualnosci/[slug]` (lista `migratedArticlePaths` w legacy-redirects.ts).
- **Polityka prywatności**: nowa strona `/polityka-prywatnosci` (administrator, wizerunek,
  cookies, RODO) + przekierowanie `/polityka-plikow-cookies` + link w stopce + sitemapa.

## Checklista cutoveru DNS

**Przed przełączeniem:**

- [x] Świeże artykuły ze starej strony przeniesione do panelu (46 szt., sezon 2025/26).
- [x] Strona polityki prywatności / cookies + przekierowanie.
- [ ] W Vercel: przypisać `rksokecie.pl` jako domenę produkcyjną oraz `www.rksokecie.pl`
      z przekierowaniem na apex (Vercel robi to automatycznie po dodaniu obu domen).

**Po przełączeniu:**

- [ ] Google Search Console: zweryfikować własność jako **property domenowe** (rekord TXT
      w DNS) — przetrwa każdą zmianę hostingu.
- [ ] Przesłać sitemapę `https://rksokecie.pl/sitemap.xml` w GSC.
- [ ] Poprosić o ponowne zaindeksowanie strony głównej i kluczowych podstron
      (Inspekcja adresu URL → Poproś o zindeksowanie).
- [ ] Przez 4–8 tygodni monitorować w GSC raport **Indeksowanie → Strony**: sekcję
      „Nie znaleziono (404)". Stare URL-e spoza sitemapy (np. obrazki
      `/sites/default/files/...`, stare aliasy) dopisywać do przekierowań w razie potrzeby.
- [ ] Przekierowań **nie usuwać** — zostają na stałe (nic nie kosztują, a chronią stare
      linki z forów, Facebooka itd.).

## Uwagi

- Next.js dla `permanent: true` zwraca **308** — Google traktuje go identycznie jak 301.
- Masowe przekierowanie ~140 starych newsów do /aktualnosci Google może uznać za
  soft-404 i wyrzucić te URL-e z indeksu — to akceptowalne: te artykuły (2018–2020) nie
  niosą ruchu. Strony, które faktycznie rankują (kontakt, drużyny, stadion, historia,
  nabory, 1,5%), mają dokładne, tematyczne odpowiedniki.
- Pozycje mogą lekko falować 2–4 tygodnie po migracji — to normalne przy zmianie URL-i;
  przy poprawnych 301 wracają.
