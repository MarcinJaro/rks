# Cutover domeny rksokecie.pl na nową stronę (Vercel)

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
