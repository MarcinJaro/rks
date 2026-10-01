# Cutover domeny rksokecie.pl na nową stronę (Vercel)

> **STATUS 2026-09-02: CUTOVER WYKONANY.** Zweryfikowane na żywo:
> apex → 76.76.21.21 (200, server: Vercel, tytuł OK), www → 308 na apex,
> stare URL-e → 308 na nowe (próbka OK), sitemap/robots OK, poczta nietknięta,
> a najstarszy serwis `rksokecie.ayz.pl` działa niezależnie i zostaje bez zmian.
> `legacy.rksokecie.pl` ma już `X-Robots-Tag: noindex, nofollow`, ale zwraca
> 403. Uruchomienie archiwum Drupala zostało świadomie odłożone jako nieistotne
> dla bieżącej produkcji. **Zostało:** migracja frontu na Clerk prod oraz GSC
> (property + sitemap — ręcznie). Uwaga: konto Cloudflare ma zaległość $6.20
> (overdue) — opłacić w Billing.

Stan przed: apex/www za proxy Cloudflare (188.114.x.x) → stary Drupal
(origin 185.208.164.60, CyberFolks). Poczta na CyberFolks - rekordy mail/smtp/
pop/ftp szare, MX bez zmian. Nowa strona: projekt `rks` na koncie Vercel
`marcinjaros-projects` (rks-eta.vercel.app), backend Convex prod
(brazen-blackbird-144 - potwierdzone w bundlu).

## Kolejność historyczna cutoveru

### 1. Archiwum Drupal pod legacy - ODROCZONE
Origin zwraca 403 dla hosta `legacy.rksokecie.pl`. Nie blokuje to nowej strony,
panelu ani najstarszego serwisu AYZ, dlatego archiwum pozostaje wyłączone do
czasu wyboru bezpiecznej metody publikacji. Szczegóły są w sekcji „Trzy osobne
serwisy i decyzja o legacy” na końcu dokumentu.

### 2. Cloudflare - subdomena legacy + noindex
- DNS: `A  legacy  185.208.164.60` - **proxy WŁĄCZONE** (pomarańczowa
  chmurka; przez proxy dołożymy nagłówek noindex).
- Rules → Transform Rules → **Modify Response Header**:
  - Warunek: Hostname equals `legacy.rksokecie.pl`
  - Akcja: Set static header `X-Robots-Tag` = `noindex, nofollow`
- Test bieżącego stanu: `curl -sI https://legacy.rksokecie.pl | grep -i
  x-robots` zwraca `noindex, nofollow`; HTTP 403 jest oczekiwany, dopóki
  publikacja archiwum pozostaje odroczona.

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
- http://rksokecie.ayz.pl → względne 302 do `news.php`; jest to niezależny,
  najstarszy serwis i zostaje bez zmian.
- https://legacy.rksokecie.pl → 403; nagłówek `X-Robots-Tag: noindex, nofollow`
  działa. Udostępnienie starego Drupala jest odroczone.

### 6. Po cutoverze (ręcznie, GSC)
- Google Search Console: property rksokecie.pl → wyślij sitemap
  `https://rksokecie.pl/sitemap.xml`.
- Stopka ma nadal prowadzić wyłącznie do http://rksokecie.ayz.pl. Nie
  podmieniamy tego odnośnika na `legacy.rksokecie.pl`.

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
- Konta administratorów na prod (wszystkie zgodne z `ADMIN_EMAILS` w Convex):
  - jaroszewicz.marcin84@gmail.com (`user_3ImtriwBEtm68WW0E7aEjVNdsw9`),
  - j.kilman@rksokecie.pl (`user_3ImzrJRwT1sLIglt8J0gWn2RQSG`),
  - g.malinowski@rksokecie.pl (`user_3ImzrIpFFRGVRGsYSHVj5gVguYv`).
  Adresy są zweryfikowane. Konta nie mają ustawionych haseł; podstawową
  metodą logowania jest kod e-mail.
- Convex prod: `convex/auth.config.ts` czyta CLERK_JWT_ISSUER_DOMAIN
  (= https://clerk.rksokecie.pl) ORAZ CLERK_JWT_ISSUER_DOMAIN_LEGACY
  (= dev), więc oba tokeny są ważne w trakcie przełączania.

### Do zrobienia (wymaga konta Vercel `marcinjaro`, projekt `rks`)
1. Settings → Environment Variables:
   - przywrócić `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/admin/sign-in`,
   - potwierdzić `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = klucz `pk_live_...`,
   - potwierdzić `CLERK_SECRET_KEY` = klucz `sk_live_...` (pobierz: `clerk env pull
     --app app_3HQ7z1uv1FL1SnL0nSVW2perpP7 --instance
     ins_3ImsknPVJmVDf5mmKxUstt2dkeY --file /tmp/clerk-prod.env`),
   - klucze `pk_live_` i `sk_live_` ograniczyć do środowiska Production, a nie
     „Production and Preview”.
2. Redeploy produkcji.
3. Weryfikacja: bundel nie zawiera `pk_test_`, formularz nie pokazuje
   „Development mode”, `/admin/sign-in` ładuje z clerk.rksokecie.pl, logowanie
   kodem e-mail działa i panel ma połączenie z Convex.
4. Po stabilizacji: `npx convex env remove CLERK_JWT_ISSUER_DOMAIN_LEGACY --prod`.
5. Google OAuth na prod nieskonfigurowany (wymaga własnego OAuth clienta) -
   niepotrzebny, logowanie mailowe wystarcza.

## Trzy osobne serwisy i decyzja o legacy

1. `https://rksokecie.pl` - nowa strona na Vercelu.
2. `http://rksokecie.ayz.pl/news.php` - najstarsza, osobna strona; pozostaje
   bez zmian i jest jedynym starym serwisem linkowanym ze stopki.
3. `https://legacy.rksokecie.pl` - planowany adres zamrożonego Drupala
   odciętego 1.09; ma pozostać `noindex`, ale jego publikacja jest odroczona.

Stan techniczny legacy z audytu 2026-09-02:

- DNS `legacy` jest proxied przez Cloudflare, a Transform Rule poprawnie dodaje
  `X-Robots-Tag: noindex, nofollow` również do odpowiedzi 403.
- Origin `185.208.164.60` zwraca Drupala 7.97 tylko dla nagłówka Host
  `rksokecie.pl`; dla Host `legacy.rksokecie.pl` zwraca 403.
- Sam Host Header Override na `rksokecie.pl` nie daje kompletnego archiwum:
  Drupal generuje dziesiątki absolutnych adresów CSS, JS, obrazów i dokumentów
  do `https://rksokecie.pl/sites/...`, które na nowej stronie zwracają 404.
- To nadal dynamiczny, niewspierany Drupal z dostępnym logowaniem i XML-RPC,
  a nie bezpieczna statyczna kopia.

Decyzja: na ten moment niczego nie zmieniamy w routingu `legacy`. Jeżeli temat
wróci, preferowana jest statyczna kopia Drupala. Wariant z żywym PHP wymaga
aliasu hosta w CyberFolks, poprawienia adresów zasobów oraz blokady logowania,
XML-RPC, administracji i metod zapisu. Nie wolno kierować `legacy` do AYZ ani
zmieniać działającego serwisu `rksokecie.ayz.pl`.
