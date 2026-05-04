This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Wyniki i terminarze RKS

Publiczny Swagger ZPNS (`bus20-api-zpns`) nie zawiera endpointów meczów ani
wyników. Aplikacja synchronizuje mecze przez Convex do własnej bazy. Frontend
czyta z naszej warstwy danych, a publiczny endpoint `/api/rks-matches` działa
jako awaryjny fallback z krótkim cache.

- Łączy Nas Piłka Competition API, jeśli w Convex ustawione są
  `LNP_BEARER_TOKEN` oraz `LNP_PLAY_ID` albo `LNP_PLAY_SOURCES`.
- Regionalny Futbol jako publiczne źródło terminarza seniorów.
- Publiczne strony terminarzy Futbolowo jako dodatkowy fallback.
- RS Sport/Virium jako publiczne źródło lig zimowych, jeżeli mamy konkretne
  `teamId`/`competitionId`.

Każda realna drużyna ma osobny `teamSlug`, więc rocznik 2010 może mieć dwa
niezależne strumienie danych: `rocznik-2010-i` i `rocznik-2010-ii`. Nie
łączymy meczów po samej nazwie "RKS Okęcie".

Oficjalne rozgrywki można podłączyć pojedynczo:

```txt
LNP_PLAY_ID=51848
LNP_TEAM_SLUG=rocznik-2010-i
LNP_MATCH_TYPE=liga
```

Albo wiele rozgrywek naraz:

```txt
LNP_PLAY_SOURCES=51848|rocznik-2010-i|liga,51855|rocznik-2010-ii|liga
```

Format wpisu to `play-id|slug-druzyny|typ-meczu|opcjonalny-team-id`.
Adresy Futbolowo i Regionalny Futbol konfiguruje się podobnie:

```txt
FUTBOLOWO_SCHEDULE_URLS=https://rksokecie.futbolowo.pl/schedule/3637/27558/4458|seniorzy|puchar
REGIONALNY_FUTBOL_SOURCES=https://regionalnyfutbol.pl/liga%2Cklasa-okregowa-mazowiecka-grupa-warszawa-ii-sezon-2025-2026%2Cokecie-warszawa.html|seniorzy|liga
```

Format wpisu to `url|slug-druzyny|typ-meczu`, a wiele drużyn można oddzielić
przecinkami. Obsługiwane typy: `liga`, `puchar`, `sparing`, `turniej`.

Ręczne uruchomienie synchronizacji:

```bash
npx convex run matchesSync:triggerConfiguredSync
```

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
