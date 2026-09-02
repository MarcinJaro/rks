# Cutover domeny rksokecie.pl na nową stronę (Vercel)

> **STATUS 2026-09-01: WYKONANE** (kroki 2–5). Zweryfikowane na żywo:
> apex → 76.76.21.21 (200, server: Vercel, tytuł OK), www → 308 na apex,
> stare URL-e → 308 na nowe (próbka OK), sitemap/robots OK, poczta nietknięta,
> legacy ma X-Robots-Tag noindex (ale origin 403 — czeka na krok 1).
> **Zostało:** krok 1 (alias legacy w panelu CyberFolks — klient) i krok 6
> (GSC: property + sitemap — ręcznie). Uwaga: konto Cloudflare ma zaległość
> $6.20 (overdue) — opłacić w Billing.

Stan przed: apex/www za proxy Cloudflare (188.114.x.x) → stary Drupal
(origin 185.208.164.60, CyberFolks). Poczta na CyberFolks - rekordy mail/smtp/
pop/ftp szare, MX bez zmian. Nowa strona: projekt `rks` na koncie Vercel
`marcinjaros-projects` (rks-eta.vercel.app), backend Convex prod
(brazen-blackbird-144 - potwierdzone w bundlu).

## Kolejność (legacy PRZED przełączeniem apexu)

### 1. CyberFolks (panel) - alias dla starej strony
Origin zwraca 403 dla nieznanych hostów (sprawdzone: `Host: legacy.rksokecie.pl`
→ 403), więc sam rekord DNS nie wystarczy:
- Dodaj domenę dodatkową / alias **legacy.rksokecie.pl** wskazującą na katalog
  starej strony (ten sam co rksokecie.pl dziś).

### 2. Cloudflare - subdomena legacy + noindex
- DNS: `A  legacy  185.208.164.60` - **proxy WŁĄCZONE** (pomarańczowa
  chmurka; przez proxy dołożymy nagłówek noindex).
- Rules → Transform Rules → **Modify Response Header**:
  - Warunek: Hostname equals `legacy.rksokecie.pl`
  - Akcja: Set static header `X-Robots-Tag` = `noindex, nofollow`
- Test: `curl -sI https://legacy.rksokecie.pl | grep -i x-robots` oraz czy
  strona się otwiera.

### 3. Vercel (konto marcinjaro, projekt rks) - domeny
Settings → Domains:
- dodaj `rksokecie.pl` (Production),
- dodaj `www.rksokecie.pl` → ustaw jako redirect 308 na `rksokecie.pl`.

### 4. Cloudflare - przełączenie apexu i www
- `rksokecie.pl` (apex): usuń obecne rekordy A/AAAA/CNAME apexu, dodaj
  `A  @  76.76.21.21` - **proxy WYŁĄCZONE (szara chmurka)**, TLS wystawia
  Vercel; podwójne proxy tylko komplikuje debug.
- `www`: `CNAME  www  cname.vercel-dns.com` - szara chmurka.
- **NIE DOTYKAĆ**: MX, mail, smtp, pop, ftp (poczta CyberFolks - awaria
  2026-08 była właśnie przez proxy na mailu).

### 5. Weryfikacja po przełączeniu (robi Claude)
- `dig rksokecie.pl` → 76.76.21.21; strona = nowa (tytuł RKS Okęcie Warszawa).
- https://www.rksokecie.pl → 308 na apex.
- Stary URL (np. `/dla-rodzicow`) → 308 na `/zawodnik`.
- Panel `/admin` działa (Clerk noble-lizard-59 + ADMIN_EMAILS ustawione na
  prod Convex - potwierdzone).
- legacy.rksokecie.pl działa i ma X-Robots-Tag; zapasowo stara strona żyje też
  na http://rksokecie.ayz.pl (302 względne, sprawdzone).

### 6. Po cutoverze (ręcznie, GSC)
- Google Search Console: property rksokecie.pl → wyślij sitemap
  `https://rksokecie.pl/sitemap.xml`.
- (Opcjonalnie) w stopce podmienić „Link do starej strony" na
  https://legacy.rksokecie.pl, gdy zadziała.

## Audyt SEO przed cutoverem (2026-08-29, na rks-eta)

- **Przekierowania: 255/255 OK** (254 zgodne z konfiguracją + 1 lepsze:
  `/walne-zebranie-...` → pełny zmigrowany artykuł, 200). Wzorce wildcard
  (rocznik-*, sekcja/*, node/*, strefa-kibica/*) - OK.
- **Kluczowe strony: 40/40 → HTTP 200** (cała nawigacja, 13 drużyn, sekcja
  /zawodnik, polityka prywatności, sitemap, robots).
- **Cele przekierowań: 75/75 → HTTP 200** (żaden 301 nie prowadzi w 404).
- robots.txt: Allow / + Disallow /admin + wskazuje sitemap na rksokecie.pl.
- sitemap.xml i canonical: pełne adresy https://rksokecie.pl (gotowe na domenę).
- Status 308 (trwałe) - równoważne 301 dla SEO.

## Clerk: migracja na instancję produkcyjną (2026-09-02)

Stan zastany: produkcja (rksokecie.pl) używała instancji DEWELOPERSKIEJ
Clerka (`pk_test_`, issuer noble-lizard-59.clerk.accounts.dev, otwarta
rejestracja). Zrobione przez Platform API (`clerk` CLI, konto
marcin@creativerebels.pl):

- Instancja produkcyjna: `ins_3ImsknPVJmVDf5mmKxUstt2dkeY`, domena
  rksokecie.pl, frontend API https://clerk.rksokecie.pl (DNS/SSL/mail:
  complete). 5 CNAME w Cloudflare (clerk, accounts, clkmail, clk._domainkey,
  clk2._domainkey) bez proxy - UWAGA: cele mail/DKIM instancji różnią się od
  tych z domain_intent (32vpeprq60ew vs kero20dtgss8) - poprawione.
- Szablon JWT `convex` z claimem `email` (wymagany przez ADMIN_EMAILS).
- `sign_up_mode = restricted` na PROD i DEV (audyt: otwarta rejestracja).
- Admin na prod: jaroszewicz.marcin84@gmail.com (`user_3ImtriwBEtm68WW0E7aEjVNdsw9`),
  logowanie kodem mailowym lub hasłem. Zgodny z ADMIN_EMAILS na Convex prod.
- Convex prod: `convex/auth.config.ts` czyta CLERK_JWT_ISSUER_DOMAIN
  (= https://clerk.rksokecie.pl) ORAZ CLERK_JWT_ISSUER_DOMAIN_LEGACY
  (= dev), więc oba tokeny są ważne w trakcie przełączania.

### Do zrobienia (wymaga konta Vercel `marcinjaro`, projekt `rks`)
1. Settings → Environment Variables (Production):
   - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = klucz `pk_live_...` instancji prod
   - CLERK_SECRET_KEY = klucz `sk_live_...` (pobierz: `clerk env pull
     --app app_3HQ7z1uv1FL1SnL0nSVW2perpP7 --instance
     ins_3ImsknPVJmVDf5mmKxUstt2dkeY --file /tmp/clerk-prod.env`)
2. Redeploy produkcji.
3. Weryfikacja: /admin/sign-in ładuje z clerk.rksokecie.pl, logowanie kodem
   na jaroszewicz.marcin84@gmail.com, panel działa.
4. Po stabilizacji: `npx convex env remove CLERK_JWT_ISSUER_DOMAIN_LEGACY --prod`.
5. Google OAuth na prod nieskonfigurowany (wymaga własnego OAuth clienta) -
   niepotrzebny, logowanie mailowe wystarcza.

## Legacy - KOREKTA po rozmowie z klientem
`legacy.rksokecie.pl` ma pokazywać Drupala działającego do 1.09, NIE
rksokecie.ayz.pl (to inny, dużo starszy serwis - zostaje bez zmian). Stary
serwer 185.208.164.60 nadal serwuje tego Drupala pod hostem `rksokecie.pl`
(HTTPS 200, 85 KB; 143 linki względne vs 18 absolutnych - nawigacja zadziała).
Origin Rule w Cloudflare: Hostname eq legacy.rksokecie.pl → Host Header
Override = `rksokecie.pl`. DNS (A, proxied) i Transform Rule noindex już są.
Token CF z 2026-09-02 ma tylko Zone.DNS - Config Rules trzeba dodać albo
kliknąć w dashboardzie.
