# Panel admina RKS — część 1: Clerk, layout, transmisje live, mecze — plan implementacji

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zabezpieczony Clerkiem panel admina z modułem transmisji live (VEO→YouTube→strona) i zarządzaniem meczami; publiczna sekcja „Mecz live" i przyciski wideo przy wynikach.

**Architecture:** Panel pozostaje w istniejącej aplikacji Next.js pod `/admin` (route group `(panel)` z własnym layoutem). Clerk chroni trasę w `src/proxy.ts` (Next 16), a każda mutacja administracyjna w Convex woła `requireAdmin(ctx)`. Live: tabela `liveStreams` w Convex; strona główna reaktywnie pokazuje sekcję live, gdy status = `live`.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, Convex 1.37, Tailwind 4, Clerk (`@clerk/nextjs` + `@clerk/localizations`), TypeScript strict.

## Global Constraints

- Next.js 16: plik middleware nazywa się **`src/proxy.ts`** (NIE `middleware.ts`).
- Repo nie ma frameworka testowego. Weryfikacja każdego zadania (zgodnie ze specyfikacją): `npm run typecheck` + `npm run lint` + ręczne sprawdzenie w przeglądarce (dev: `npm run dev` + `npm run dev:convex`).
- Wszystkie teksty UI w panelu po polsku, sentence case („Rozpocznij transmisję", nie „Rozpocznij Transmisję").
- KAŻDA mutacja/query administracyjna w Convex zaczyna handler od `await requireAdmin(ctx)`.
- Styl kodu jak w repo: komponenty klienckie `"use client"`, Tailwind z tokenami (`bg-card`, `text-primary`, `border-border`…), import api Convex przez `../../../convex/_generated/api` (ścieżka względna wg głębokości pliku).
- Commit po każdym zadaniu; stopka: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Spec: `docs/superpowers/specs/2026-08-03-veo-admin-panel-design.md`.

---

### Task 0: Konfiguracja Clerk (kroki użytkownika + zmienne środowiskowe)

**Files:**
- Modify: `.env.local` (dopisanie kluczy; plik jest poza gitem)

**Interfaces:**
- Produces: działające klucze Clerk w env; `CLERK_JWT_ISSUER_DOMAIN` w env deploymentu Convex.

Kroki wymagające użytkownika (przekaż mu tę listę i poczekaj na klucze):

1. Na https://dashboard.clerk.com utwórz aplikację (np. „RKS Okęcie Admin"), metoda logowania: e-mail + hasło.
2. W **Configure → Restrictions** wyłącz publiczne rejestracje (tryb „Restricted"). Adminów zapraszaj przez **Users → Invite**.
3. W **Configure → Integrations** aktywuj integrację **Convex**. Skopiuj „Frontend API URL" (format `https://xxx.clerk.accounts.dev`) — to będzie `CLERK_JWT_ISSUER_DOMAIN`.
4. Skopiuj `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` i `CLERK_SECRET_KEY` z **API keys**.
5. W dashboardzie Convex (https://dashboard.convex.dev, projekt rks-okecie) w **Settings → Environment variables** dodaj `CLERK_JWT_ISSUER_DOMAIN` = Frontend API URL.
6. W Vercel (Settings → Environment variables) dodaj `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/admin/sign-in`.

- [ ] **Step 1: Dopisz zmienne do `.env.local`**

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/admin/sign-in
```

- [ ] **Step 2: Zweryfikuj, że `NEXT_PUBLIC_CONVEX_URL` już jest w `.env.local`** (jest używany przez istniejący kod). Jeśli go nie ma, uruchom `npx convex dev` raz — zapisze go automatycznie.

Bez commita (plik poza gitem).

---

### Task 1: Instalacja Clerk, proxy, provider, strona logowania

**Files:**
- Modify: `package.json` (przez `npm install`)
- Create: `src/proxy.ts`
- Create: `convex/auth.config.ts`
- Modify: `src/components/providers/AppProviders.tsx`
- Create: `src/app/admin/sign-in/[[...rest]]/page.tsx`

**Interfaces:**
- Produces: zalogowany użytkownik Clerk widoczny w Convex jako `ctx.auth.getUserIdentity()`; trasa `/admin(.*)` (poza `/admin/sign-in`) wymaga logowania.

- [ ] **Step 1: Zainstaluj pakiety**

Run: `npm install @clerk/nextjs @clerk/localizations`
Expected: dodane do dependencies bez błędów peer-deps.

- [ ] **Step 2: Utwórz `src/proxy.ts`**

```ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isSignInRoute = createRouteMatcher(["/admin/sign-in(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isAdminRoute(req) && !isSignInRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

`auth.protect()` przekierowuje niezalogowanych na `NEXT_PUBLIC_CLERK_SIGN_IN_URL` (`/admin/sign-in`).

- [ ] **Step 3: Utwórz `convex/auth.config.ts`**

```ts
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
};
```

- [ ] **Step 4: Przepisz `src/components/providers/AppProviders.tsx`**

```tsx
"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { plPL } from "@clerk/localizations";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ReactNode, useMemo } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const convex = useMemo(
    () => (convexUrl ? new ConvexReactClient(convexUrl) : null),
    [convexUrl],
  );

  if (!convex) return <>{children}</>;

  return (
    <ClerkProvider localization={plPL}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

- [ ] **Step 5: Utwórz `src/app/admin/sign-in/[[...rest]]/page.tsx`**

```tsx
import { SignIn } from "@clerk/nextjs";

export default function AdminSignInPage() {
  return (
    <div className="container-page flex justify-center py-16">
      <SignIn fallbackRedirectUrl="/admin" />
    </div>
  );
}
```

- [ ] **Step 6: Wypchnij konfigurację auth do Convex**

Run: `npx convex dev --once`
Expected: deploy bez błędów (auth.config wymaga `CLERK_JWT_ISSUER_DOMAIN` w env deploymentu — Task 0 krok 5).

- [ ] **Step 7: Weryfikacja**

Run: `npm run typecheck && npm run lint`
Expected: bez błędów.
Ręcznie: uruchom `npm run dev` i `npm run dev:convex`; wejdź na `http://localhost:3000/admin` → przekierowanie na `/admin/sign-in`; zaloguj się zaproszonym kontem → wracasz na `/admin` (stare kafelki). Strona główna `/` działa bez logowania.

- [ ] **Step 8: Commit**

```bash
git add src/proxy.ts convex/auth.config.ts src/components/providers/AppProviders.tsx src/app/admin/sign-in package.json package-lock.json
git commit -m "Add Clerk auth protecting /admin with Convex integration"
```

---

### Task 2: Helper requireAdmin i ochrona istniejącej mutacji

**Files:**
- Create: `convex/adminAuth.ts`
- Modify: `convex/teams.ts:38` (handler `upsert`)

**Interfaces:**
- Produces: `requireAdmin(ctx: QueryCtx | MutationCtx): Promise<UserIdentity>` — rzuca `Error("Brak autoryzacji")` gdy brak tożsamości. Wszystkie kolejne zadania (i cały plan 2) używają dokładnie tej sygnatury: `await requireAdmin(ctx)` jako pierwsza linia handlera.

- [ ] **Step 1: Utwórz `convex/adminAuth.ts`**

```ts
import type { MutationCtx, QueryCtx } from "./_generated/server";

export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Brak autoryzacji");
  }
  return identity;
}
```

- [ ] **Step 2: Zabezpiecz `teams.upsert`**

W `convex/teams.ts` dodaj import i wywołanie na początku handlera:

```ts
import { requireAdmin } from "./adminAuth";
```

a w handlerze `upsert` (linia ~38) jako pierwszą instrukcję:

```ts
handler: async (ctx, args) => {
  await requireAdmin(ctx);
  const existing = await ctx.db
```

- [ ] **Step 3: Weryfikacja**

Run: `npm run typecheck && npx convex dev --once`
Expected: bez błędów.

- [ ] **Step 4: Commit**

```bash
git add convex/adminAuth.ts convex/teams.ts
git commit -m "Add requireAdmin guard for Convex admin mutations"
```

---

### Task 3: Layout panelu z nawigacją + pulpit

**Files:**
- Create: `src/app/admin/(panel)/layout.tsx`
- Move: `src/app/admin/page.tsx` → `src/app/admin/(panel)/page.tsx` (potem przepisz)
- Move: `src/app/admin/articles/` → `src/app/admin/(panel)/articles/`
- Move: `src/app/admin/fb-posts/` → `src/app/admin/(panel)/fb-posts/`
- Delete: `src/app/admin/teams/` (zastąpi go `/admin/druzyny` w planie 2)

**Interfaces:**
- Consumes: Clerk `UserButton` (Task 1).
- Produces: layout z nawigacją dla wszystkich stron w grupie `(panel)`; ścieżki modułów: `/admin/live`, `/admin/mecze`, `/admin/druzyny`, `/admin/ludzie`, `/admin/sponsorzy`, `/admin/galerie`, `/admin/dokumenty`, `/admin/ustawienia` (kolejne zadania i plan 2 tworzą strony DOKŁADNIE pod tymi ścieżkami, w grupie `(panel)`).

- [ ] **Step 1: Przenieś istniejące strony**

```bash
mkdir -p "src/app/admin/(panel)"
git mv src/app/admin/page.tsx "src/app/admin/(panel)/page.tsx"
git mv src/app/admin/articles "src/app/admin/(panel)/articles"
git mv src/app/admin/fb-posts "src/app/admin/(panel)/fb-posts"
git rm -r src/app/admin/teams
```

- [ ] **Step 2: Utwórz `src/app/admin/(panel)/layout.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { ReactNode } from "react";

const navItems = [
  { href: "/admin", label: "Pulpit" },
  { href: "/admin/live", label: "Transmisja live" },
  { href: "/admin/mecze", label: "Mecze" },
  { href: "/admin/druzyny", label: "Drużyny" },
  { href: "/admin/ludzie", label: "Ludzie" },
  { href: "/admin/sponsorzy", label: "Sponsorzy" },
  { href: "/admin/galerie", label: "Galerie" },
  { href: "/admin/dokumenty", label: "Dokumenty" },
  { href: "/admin/ustawienia", label: "Ustawienia" },
];

export default function AdminPanelLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="container-page grid gap-8 py-10 lg:grid-cols-[220px_1fr]">
      <aside>
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm font-black uppercase text-primary">
            Panel admina
          </p>
          <UserButton />
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm font-bold transition ${
                  isActive
                    ? "bg-muted text-primary"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: Przepisz `src/app/admin/(panel)/page.tsx` (pulpit)**

```tsx
import Link from "next/link";

const modules = [
  ["Transmisja live", "/admin/live", "Włącz i wyłącz sekcję „Mecz live" na stronie głównej"],
  ["Mecze", "/admin/mecze", "Terminarz, wyniki i linki do nagrań VEO/YouTube"],
  ["Drużyny", "/admin/druzyny", "Zespoły, trenerzy, zdjęcia grupowe"],
  ["Ludzie", "/admin/ludzie", "Trenerzy, zarząd, legendy klubu"],
  ["Sponsorzy", "/admin/sponsorzy", "Loga, linki i kolejność partnerów"],
  ["Galerie", "/admin/galerie", "Albumy zdjęć z meczów i wydarzeń"],
  ["Dokumenty", "/admin/dokumenty", "Pliki PDF na stronie dokumentów klubu"],
  ["Ustawienia", "/admin/ustawienia", "Dane kontaktowe i linki społecznościowe"],
] as const;

export default function AdminDashboardPage() {
  return (
    <>
      <h1 className="text-3xl font-black text-navy">Pulpit</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Wybierz moduł, którym chcesz zarządzać.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules.map(([label, href, description]) => (
          <Link
            key={href}
            href={href}
            className="rounded-lg border border-border bg-card p-5 shadow-sm transition hover:border-primary"
          >
            <p className="text-lg font-black text-navy">{label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 4: Weryfikacja**

Run: `npm run typecheck && npm run lint`
Expected: bez błędów.
Ręcznie: `/admin` pokazuje pulpit z nawigacją boczną; `/admin/articles` i `/admin/fb-posts` nadal działają (w nowym layoucie); `/admin/teams` zwraca 404.

- [ ] **Step 5: Commit**

```bash
git add -A src/app/admin
git commit -m "Add admin panel layout with sidebar nav and dashboard"
```

---

### Task 4: Schemat liveStreams + pola wideo + funkcje Convex

**Files:**
- Modify: `convex/schema.ts` (tabela `matches` ~linia 106; nowa tabela po `matchEvents`)
- Create: `convex/liveStreams.ts`
- Create: `src/lib/youtube.ts`

**Interfaces:**
- Consumes: `requireAdmin` z `convex/adminAuth.ts` (Task 2).
- Produces:
  - Pola `veoUrl?: string`, `youtubeUrl?: string` na dokumentach `matches`.
  - `api.liveStreams.active` — query bez argumentów → dokument `liveStreams` ze statusem `"live"` albo `null` (używa go Task 6).
  - `api.liveStreams.list` (admin) → 20 ostatnich transmisji.
  - Mutacje: `create({ title, youtubeUrl, matchId? })`, `start({ id })`, `end({ id })`, `saveToMatch({ id, matchId })`, `remove({ id })` — wszystkie z guardem.
  - `extractYoutubeId(url: string): string | null` i `youtubeEmbedUrl(url: string): string | null` z `src/lib/youtube.ts` (używają ich Task 5, 6, 8).

- [ ] **Step 1: Dodaj pola do `matches` w `convex/schema.ts`**

Po linii `articleId: v.optional(v.id("articles")),` dodaj:

```ts
    veoUrl: v.optional(v.string()),
    youtubeUrl: v.optional(v.string()),
```

- [ ] **Step 2: Dodaj tabelę `liveStreams` w `convex/schema.ts`**

Po definicji `matchEvents` (za `.index("by_sourceEventId", ...)`) dodaj:

```ts
  liveStreams: defineTable({
    title: v.string(),
    youtubeUrl: v.string(),
    matchId: v.optional(v.id("matches")),
    status: v.union(
      v.literal("scheduled"),
      v.literal("live"),
      v.literal("ended"),
    ),
    startsAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
  }).index("by_status", ["status"]),
```

- [ ] **Step 3: Utwórz `convex/liveStreams.ts`**

```ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";

export const active = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("liveStreams")
      .withIndex("by_status", (q) => q.eq("status", "live"))
      .order("desc")
      .first();
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("liveStreams").order("desc").take(20);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    youtubeUrl: v.string(),
    matchId: v.optional(v.id("matches")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!args.title.trim()) throw new Error("Podaj tytuł transmisji");
    return await ctx.db.insert("liveStreams", {
      ...args,
      status: "scheduled",
    });
  },
});

export const start = mutation({
  args: { id: v.id("liveStreams") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const live = await ctx.db
      .query("liveStreams")
      .withIndex("by_status", (q) => q.eq("status", "live"))
      .collect();
    for (const other of live) {
      await ctx.db.patch(other._id, { status: "ended", endedAt: Date.now() });
    }
    await ctx.db.patch(id, { status: "live", startsAt: Date.now() });
  },
});

export const end = mutation({
  args: { id: v.id("liveStreams") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { status: "ended", endedAt: Date.now() });
  },
});

export const saveToMatch = mutation({
  args: { id: v.id("liveStreams"), matchId: v.id("matches") },
  handler: async (ctx, { id, matchId }) => {
    await requireAdmin(ctx);
    const stream = await ctx.db.get(id);
    if (!stream) throw new Error("Nie znaleziono transmisji");
    await ctx.db.patch(matchId, { youtubeUrl: stream.youtubeUrl });
    await ctx.db.patch(id, { matchId });
  },
});

export const remove = mutation({
  args: { id: v.id("liveStreams") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});
```

- [ ] **Step 4: Utwórz `src/lib/youtube.ts`**

```ts
export function extractYoutubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|live\/|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  return match ? match[1] : null;
}

export function youtubeEmbedUrl(url: string): string | null {
  const id = extractYoutubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}
```

- [ ] **Step 5: Weryfikacja**

Run: `npx convex dev --once && npm run typecheck`
Expected: schemat przyjęty (nowa tabela + opcjonalne pola nie wymagają migracji), typy przechodzą.

- [ ] **Step 6: Commit**

```bash
git add convex/schema.ts convex/liveStreams.ts src/lib/youtube.ts
git commit -m "Add liveStreams table, match video fields and YouTube helpers"
```

---

### Task 5: Moduł „Transmisja live" w panelu

**Files:**
- Create: `src/app/admin/(panel)/live/page.tsx`

**Interfaces:**
- Consumes: `api.liveStreams.{list,create,start,end,saveToMatch,remove}` (Task 4), `api.matches.upcoming`, `api.matches.latestResults` (istniejące), `youtubeEmbedUrl` z `@/lib/youtube`, `Button` z `@/components/ui/button`.

- [ ] **Step 1: Utwórz `src/app/admin/(panel)/live/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { youtubeEmbedUrl } from "@/lib/youtube";

const statusLabels: Record<string, string> = {
  scheduled: "Zaplanowana",
  live: "Na żywo",
  ended: "Zakończona",
};

function formatDate(timestamp?: number) {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export default function AdminLivePage() {
  const streams = useQuery(api.liveStreams.list);
  const upcoming = useQuery(api.matches.upcoming, { limit: 20 });
  const recent = useQuery(api.matches.latestResults, { limit: 10 });
  const createStream = useMutation(api.liveStreams.create);
  const startStream = useMutation(api.liveStreams.start);
  const endStream = useMutation(api.liveStreams.end);
  const saveToMatch = useMutation(api.liveStreams.saveToMatch);
  const removeStream = useMutation(api.liveStreams.remove);

  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [matchId, setMatchId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = youtubeEmbedUrl(youtubeUrl);
  const matchOptions = [...(upcoming ?? []), ...(recent ?? [])];

  async function handleCreate() {
    setError(null);
    setMessage(null);
    if (!previewUrl) {
      setError("Ten link nie wygląda na poprawny adres YouTube");
      return;
    }
    try {
      await createStream({
        title,
        youtubeUrl,
        matchId: matchId ? (matchId as Id<"matches">) : undefined,
      });
      setTitle("");
      setYoutubeUrl("");
      setMatchId("");
      setMessage("Transmisja dodana — możesz ją rozpocząć poniżej");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Coś poszło nie tak");
    }
  }

  async function run(action: () => Promise<unknown>, success: string) {
    setError(null);
    setMessage(null);
    try {
      await action();
      setMessage(success);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Coś poszło nie tak");
    }
  }

  return (
    <>
      <h1 className="text-3xl font-black text-navy">Transmisja live</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Wklej link z YouTube (tam streamuje kamera VEO), sprawdź podgląd i
        rozpocznij transmisję — sekcja „Mecz live" pojawi się na stronie
        głównej automatycznie.
      </p>

      {message ? (
        <p className="mt-4 rounded-md bg-primary/15 px-4 py-2 text-sm font-bold text-primary">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-md bg-red-500/15 px-4 py-2 text-sm font-bold text-red-300">
          {error}
        </p>
      ) : null}

      <section className="mt-6 rounded-lg border border-border bg-card p-5">
        <h2 className="text-lg font-black text-navy">Nowa transmisja</h2>
        <div className="mt-4 grid gap-4">
          <label className="grid gap-1 text-sm font-bold">
            Tytuł
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="RKS Okęcie — Znicz II Pruszków"
              className="rounded-md border border-border bg-background px-3 py-2 font-normal"
            />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Link do transmisji YouTube
            <input
              value={youtubeUrl}
              onChange={(event) => setYoutubeUrl(event.target.value)}
              placeholder="https://youtube.com/live/..."
              className="rounded-md border border-border bg-background px-3 py-2 font-mono text-sm font-normal"
            />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Powiązany mecz (opcjonalnie)
            <select
              value={matchId}
              onChange={(event) => setMatchId(event.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 font-normal"
            >
              <option value="">— bez powiązania —</option>
              {matchOptions.map((match) => (
                <option key={match._id} value={match._id}>
                  {match.homeTeam} — {match.awayTeam} ({formatDate(match.date)})
                </option>
              ))}
            </select>
          </label>
          {previewUrl ? (
            <div className="aspect-video max-w-xl overflow-hidden rounded-md">
              <iframe
                src={previewUrl}
                title="Podgląd transmisji"
                className="h-full w-full"
                allowFullScreen
              />
            </div>
          ) : youtubeUrl ? (
            <p className="text-sm font-bold text-red-300">
              Nie rozpoznano identyfikatora wideo w tym linku
            </p>
          ) : null}
          <div>
            <Button onClick={handleCreate} disabled={!title || !previewUrl}>
              Dodaj transmisję
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-black text-navy">Transmisje</h2>
        <div className="mt-4 grid gap-3">
          {(streams ?? []).map((stream) => (
            <article
              key={stream._id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-black text-navy">{stream.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {statusLabels[stream.status]}
                    {stream.startsAt
                      ? ` · start ${formatDate(stream.startsAt)}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {stream.status !== "live" ? (
                    <Button
                      size="sm"
                      onClick={() =>
                        run(
                          () => startStream({ id: stream._id }),
                          "Transmisja włączona — sekcja live jest na stronie głównej",
                        )
                      }
                    >
                      Rozpocznij
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        run(
                          () => endStream({ id: stream._id }),
                          "Transmisja zakończona",
                        )
                      }
                    >
                      Zakończ
                    </Button>
                  )}
                  {stream.matchId && stream.status === "ended" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        run(
                          () =>
                            saveToMatch({
                              id: stream._id,
                              matchId: stream.matchId!,
                            }),
                          "Link zapisany przy meczu jako archiwum",
                        )
                      }
                    >
                      Zapisz przy meczu
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      run(
                        () => removeStream({ id: stream._id }),
                        "Transmisja usunięta",
                      )
                    }
                  >
                    Usuń
                  </Button>
                </div>
              </div>
            </article>
          ))}
          {streams && streams.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Brak transmisji — dodaj pierwszą powyżej.
            </p>
          ) : null}
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Weryfikacja**

Run: `npm run typecheck && npm run lint`
Expected: bez błędów.
Ręcznie: `/admin/live` — dodaj transmisję z linkiem `https://www.youtube.com/watch?v=dQw4w9WgXcQ` (podgląd musi się pokazać), kliknij „Rozpocznij", sprawdź w liście status „Na żywo", potem „Zakończ", „Usuń". Błędny link (np. `https://example.com`) musi blokować przycisk i pokazać komunikat.

- [ ] **Step 3: Commit**

```bash
git add "src/app/admin/(panel)/live"
git commit -m "Add live stream admin module"
```

---

### Task 6: Sekcja „Mecz live" na stronie głównej

**Files:**
- Create: `src/components/home/LiveNow.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `api.liveStreams.active` (Task 4), `youtubeEmbedUrl` z `@/lib/youtube`.

- [ ] **Step 1: Utwórz `src/components/home/LiveNow.tsx`**

```tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { youtubeEmbedUrl } from "@/lib/youtube";

function LiveNowInner() {
  const stream = useQuery(api.liveStreams.active);
  if (!stream) return null;

  const embedUrl = youtubeEmbedUrl(stream.youtubeUrl);
  if (!embedUrl) return null;

  return (
    <section className="container-page py-10">
      <div className="rounded-[24px] border border-white/8 bg-card p-6">
        <p className="flex items-center gap-2 text-sm font-black uppercase text-primary">
          <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
          Mecz live
        </p>
        <h2 className="mt-3 text-2xl font-black text-white">{stream.title}</h2>
        <div className="mt-5 aspect-video overflow-hidden rounded-[14px]">
          <iframe
            src={embedUrl}
            title={stream.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}

export function LiveNow() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return null;
  return <LiveNowInner />;
}
```

- [ ] **Step 2: Wstaw sekcję do `src/app/page.tsx`**

```tsx
import { Hero } from "@/components/home/Hero";
import { LatestFbPosts } from "@/components/home/LatestFbPosts";
import { LiveNow } from "@/components/home/LiveNow";
import { MatchCenter } from "@/components/home/MatchCenter";
import { SponsorBar } from "@/components/home/SponsorBar";
import { TeamsGrid } from "@/components/home/TeamsGrid";

export default function Home() {
  return (
    <>
      <Hero />
      <LiveNow />
      <MatchCenter />
      <TeamsGrid />
      <LatestFbPosts />
      <SponsorBar />
    </>
  );
}
```

- [ ] **Step 3: Weryfikacja**

Run: `npm run typecheck && npm run lint`
Expected: bez błędów.
Ręcznie: w `/admin/live` rozpocznij transmisję → na `/` (bez logowania, np. okno incognito) pod hero pojawia się sekcja „Mecz live" z playerem; „Zakończ" w panelu → sekcja znika bez odświeżania strony.

- [ ] **Step 4: Commit**

```bash
git add src/components/home/LiveNow.tsx src/app/page.tsx
git commit -m "Show live match section on homepage when stream is active"
```

---

### Task 7: Moduł „Mecze" w panelu

**Files:**
- Modify: `convex/matches.ts` (dodaj `mutation` do importów; nowe funkcje na końcu pliku)
- Create: `src/app/admin/(panel)/mecze/page.tsx`

**Interfaces:**
- Consumes: `requireAdmin` (Task 2), pola `veoUrl`/`youtubeUrl` (Task 4), `api.teams.list` (istniejące).
- Produces:
  - `api.matches.adminList({ teamId?, status? })` → do 200 meczów malejąco po dacie.
  - `api.matches.createManual({ homeTeam, awayTeam, date, venue?, matchType, status, teamId?, result? })` → id meczu (source: `"manual"`).
  - `api.matches.update({ id, homeTeam?, awayTeam?, date?, venue?, matchType?, status?, teamId?, result?, veoUrl?, youtubeUrl? })`.
  - `api.matches.removeMatch({ id })`.

- [ ] **Step 1: Dodaj funkcje administracyjne do `convex/matches.ts`**

Zmień pierwszą linię importów na:

```ts
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
```

Dodaj import guarda pod istniejącymi importami:

```ts
import { requireAdmin } from "./adminAuth";
```

Na końcu pliku dodaj:

```ts
export const adminList = query({
  args: {
    teamId: v.optional(v.id("teams")),
    status: v.optional(matchStatus),
  },
  handler: async (ctx, { teamId, status }) => {
    await requireAdmin(ctx);
    let matches;
    if (teamId) {
      matches = await ctx.db
        .query("matches")
        .withIndex("by_team", (q) => q.eq("teamId", teamId))
        .order("desc")
        .take(200);
      if (status) matches = matches.filter((m) => m.status === status);
    } else if (status) {
      matches = await ctx.db
        .query("matches")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .take(200);
    } else {
      matches = await ctx.db
        .query("matches")
        .withIndex("by_date")
        .order("desc")
        .take(200);
    }
    return matches;
  },
});

export const createManual = mutation({
  args: {
    homeTeam: v.string(),
    awayTeam: v.string(),
    date: v.number(),
    venue: v.optional(v.string()),
    matchType,
    status: matchStatus,
    teamId: v.optional(v.id("teams")),
    result: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!args.homeTeam.trim() || !args.awayTeam.trim()) {
      throw new Error("Podaj nazwy obu drużyn");
    }
    return await ctx.db.insert("matches", { ...args, source: "manual" });
  },
});

export const update = mutation({
  args: {
    id: v.id("matches"),
    homeTeam: v.optional(v.string()),
    awayTeam: v.optional(v.string()),
    date: v.optional(v.number()),
    venue: v.optional(v.string()),
    matchType: v.optional(matchType),
    status: v.optional(matchStatus),
    teamId: v.optional(v.id("teams")),
    result: v.optional(v.string()),
    veoUrl: v.optional(v.string()),
    youtubeUrl: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    const match = await ctx.db.get(id);
    if (!match) throw new Error("Nie znaleziono meczu");
    await ctx.db.patch(id, fields);
  },
});

export const removeMatch = mutation({
  args: { id: v.id("matches") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});
```

Uwaga: `matchType` w argach `update` koliduje nazwą ze stałą modułu — w `update` użyj zapisu `matchType: v.optional(matchType)` dokładnie jak wyżej (wartość to stała zdefiniowana na górze pliku `convex/matches.ts:4`).

- [ ] **Step 2: Utwórz `src/app/admin/(panel)/mecze/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

const typeLabels = {
  liga: "Liga",
  sparing: "Sparing",
  turniej: "Turniej",
  puchar: "Puchar",
} as const;

const statusOptions = [
  ["upcoming", "Nadchodzący"],
  ["live", "Na żywo"],
  ["finished", "Zakończony"],
] as const;

type MatchStatus = Doc<"matches">["status"];
type MatchType = Doc<"matches">["matchType"];

type FormState = {
  homeTeam: string;
  awayTeam: string;
  date: string;
  venue: string;
  matchType: MatchType;
  status: MatchStatus;
  teamId: string;
  result: string;
  veoUrl: string;
  youtubeUrl: string;
};

const emptyForm: FormState = {
  homeTeam: "",
  awayTeam: "",
  date: "",
  venue: "",
  matchType: "liga",
  status: "upcoming",
  teamId: "",
  result: "",
  veoUrl: "",
  youtubeUrl: "",
};

function toInputValue(timestamp: number) {
  const date = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export default function AdminMatchesPage() {
  const [filterTeam, setFilterTeam] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [editingId, setEditingId] = useState<Id<"matches"> | "new" | null>(
    null,
  );
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const teams = useQuery(api.teams.list, {});
  const matches = useQuery(api.matches.adminList, {
    teamId: filterTeam ? (filterTeam as Id<"teams">) : undefined,
    status: filterStatus ? (filterStatus as MatchStatus) : undefined,
  });
  const createManual = useMutation(api.matches.createManual);
  const updateMatch = useMutation(api.matches.update);
  const removeMatch = useMutation(api.matches.removeMatch);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openNew() {
    setForm(emptyForm);
    setEditingId("new");
    setError(null);
  }

  function openEdit(match: Doc<"matches">) {
    setForm({
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      date: toInputValue(match.date),
      venue: match.venue ?? "",
      matchType: match.matchType,
      status: match.status,
      teamId: match.teamId ?? "",
      result: match.result ?? "",
      veoUrl: match.veoUrl ?? "",
      youtubeUrl: match.youtubeUrl ?? "",
    });
    setEditingId(match._id);
    setError(null);
  }

  async function handleSave() {
    setError(null);
    const timestamp = new Date(form.date).getTime();
    if (!form.date || Number.isNaN(timestamp)) {
      setError("Podaj poprawną datę meczu");
      return;
    }
    const fields = {
      homeTeam: form.homeTeam,
      awayTeam: form.awayTeam,
      date: timestamp,
      venue: form.venue || undefined,
      matchType: form.matchType,
      status: form.status,
      teamId: form.teamId ? (form.teamId as Id<"teams">) : undefined,
      result: form.result || undefined,
    };
    try {
      if (editingId === "new") {
        await createManual(fields);
      } else if (editingId) {
        await updateMatch({
          id: editingId,
          ...fields,
          veoUrl: form.veoUrl || undefined,
          youtubeUrl: form.youtubeUrl || undefined,
        });
      }
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Coś poszło nie tak");
    }
  }

  async function handleDelete(id: Id<"matches">) {
    if (!window.confirm("Usunąć ten mecz? Tej operacji nie można cofnąć.")) {
      return;
    }
    await removeMatch({ id });
    if (editingId === id) setEditingId(null);
  }

  const inputClass =
    "rounded-md border border-border bg-background px-3 py-2 font-normal";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black text-navy">Mecze</h1>
        <Button onClick={openNew}>Dodaj mecz</Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <select
          value={filterTeam}
          onChange={(event) => setFilterTeam(event.target.value)}
          className={inputClass}
        >
          <option value="">Drużyna: wszystkie</option>
          {(teams ?? []).map((team) => (
            <option key={team._id} value={team._id}>
              {team.name}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(event) => setFilterStatus(event.target.value)}
          className={inputClass}
        >
          <option value="">Status: wszystkie</option>
          {statusOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {editingId ? (
        <section className="mt-6 rounded-lg border border-border bg-card p-5">
          <h2 className="text-lg font-black text-navy">
            {editingId === "new" ? "Nowy mecz" : "Edycja meczu"}
          </h2>
          {error ? (
            <p className="mt-3 rounded-md bg-red-500/15 px-4 py-2 text-sm font-bold text-red-300">
              {error}
            </p>
          ) : null}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-bold">
              Gospodarz
              <input
                value={form.homeTeam}
                onChange={(event) => set("homeTeam", event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="grid gap-1 text-sm font-bold">
              Gość
              <input
                value={form.awayTeam}
                onChange={(event) => set("awayTeam", event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="grid gap-1 text-sm font-bold">
              Data i godzina
              <input
                type="datetime-local"
                value={form.date}
                onChange={(event) => set("date", event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="grid gap-1 text-sm font-bold">
              Miejsce
              <input
                value={form.venue}
                onChange={(event) => set("venue", event.target.value)}
                placeholder="ul. Radarowa 1"
                className={inputClass}
              />
            </label>
            <label className="grid gap-1 text-sm font-bold">
              Typ
              <select
                value={form.matchType}
                onChange={(event) =>
                  set("matchType", event.target.value as MatchType)
                }
                className={inputClass}
              >
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold">
              Status
              <select
                value={form.status}
                onChange={(event) =>
                  set("status", event.target.value as MatchStatus)
                }
                className={inputClass}
              >
                {statusOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold">
              Drużyna RKS
              <select
                value={form.teamId}
                onChange={(event) => set("teamId", event.target.value)}
                className={inputClass}
              >
                <option value="">— brak —</option>
                {(teams ?? []).map((team) => (
                  <option key={team._id} value={team._id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold">
              Wynik (np. 2:1)
              <input
                value={form.result}
                onChange={(event) => set("result", event.target.value)}
                className={inputClass}
              />
            </label>
            {editingId !== "new" ? (
              <>
                <label className="grid gap-1 text-sm font-bold">
                  Link do nagrania VEO
                  <input
                    value={form.veoUrl}
                    onChange={(event) => set("veoUrl", event.target.value)}
                    placeholder="https://app.veo.co/matches/..."
                    className={`${inputClass} font-mono text-sm`}
                  />
                </label>
                <label className="grid gap-1 text-sm font-bold">
                  Link do YouTube
                  <input
                    value={form.youtubeUrl}
                    onChange={(event) => set("youtubeUrl", event.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className={`${inputClass} font-mono text-sm`}
                  />
                </label>
              </>
            ) : null}
          </div>
          <div className="mt-5 flex gap-2">
            <Button onClick={handleSave} disabled={!form.homeTeam || !form.awayTeam}>
              Zapisz
            </Button>
            <Button variant="ghost" onClick={() => setEditingId(null)}>
              Anuluj
            </Button>
          </div>
        </section>
      ) : null}

      <div className="mt-6 grid gap-3">
        {(matches ?? []).map((match) => (
          <article
            key={match._id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4"
          >
            <div className="min-w-0">
              <p className="font-black text-navy">
                {match.homeTeam} — {match.awayTeam}
                {match.result ? (
                  <span className="ml-2 rounded-md bg-primary px-2 py-0.5 text-sm text-primary-foreground">
                    {match.result}
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDate(match.date)} · {typeLabels[match.matchType]} ·{" "}
                {match.source === "manual" || !match.source
                  ? "ręczny"
                  : `sync: ${match.source}`}
                {match.veoUrl ? " · VEO" : ""}
                {match.youtubeUrl ? " · YT" : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => openEdit(match)}>
                Edytuj
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(match._id)}
              >
                Usuń
              </Button>
            </div>
          </article>
        ))}
        {matches && matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Brak meczów dla wybranych filtrów.
          </p>
        ) : null}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Weryfikacja**

Run: `npx convex dev --once && npm run typecheck && npm run lint`
Expected: bez błędów.
Ręcznie: `/admin/mecze` — dodaj mecz ręczny, edytuj wynik, wklej link VEO i YT (w edycji), przefiltruj po statusie, usuń mecz testowy. Mecze z synca lig mają etykietę `sync: lnp` itd.

- [ ] **Step 4: Commit**

```bash
git add convex/matches.ts "src/app/admin/(panel)/mecze"
git commit -m "Add match admin module with manual CRUD and video links"
```

---

### Task 8: Przyciski VEO/YouTube przy wynikach na stronie publicznej

**Files:**
- Modify: `src/data/site.ts:124-136` (typ `MatchItem`)
- Modify: `src/components/home/MatchCenter.tsx:74-117` (komponent `ResultsList`)

**Interfaces:**
- Consumes: pola `veoUrl`/`youtubeUrl` z dokumentów `matches` (Task 4) — `api.matches.center` zwraca pełne dokumenty, więc pola przechodzą bez zmian w query.

- [ ] **Step 1: Rozszerz typ `MatchItem` w `src/data/site.ts`**

Po linii `result?: string;` dodaj:

```ts
  veoUrl?: string;
  youtubeUrl?: string;
```

- [ ] **Step 2: Dodaj linki wideo w `ResultsList` w `MatchCenter.tsx`**

W komponencie `ResultsList`, wewnątrz `<article>`, bezpośrednio po bloku
`{match.teamName ? (...) : null}` dodaj:

```tsx
          {match.veoUrl || match.youtubeUrl ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {match.veoUrl ? (
                <a
                  href={match.veoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md bg-white/15 px-3 py-1 text-xs font-black uppercase text-white transition hover:bg-primary hover:text-primary-foreground"
                >
                  ▶ Nagranie VEO
                </a>
              ) : null}
              {match.youtubeUrl ? (
                <a
                  href={match.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md bg-white/15 px-3 py-1 text-xs font-black uppercase text-white transition hover:bg-primary hover:text-primary-foreground"
                >
                  ▶ YouTube
                </a>
              ) : null}
            </div>
          ) : null}
```

- [ ] **Step 3: Weryfikacja**

Run: `npm run typecheck && npm run lint`
Expected: bez błędów.
Ręcznie: w `/admin/mecze` ustaw link VEO i YT na zakończonym meczu → na `/wyniki` (sekcja „Ostatnie wyniki") przy tym meczu pojawiają się oba przyciski, otwierają się w nowej karcie; mecz bez linków nie pokazuje przycisków.

- [ ] **Step 4: Commit**

```bash
git add src/data/site.ts src/components/home/MatchCenter.tsx
git commit -m "Show VEO and YouTube links on public match results"
```

---

### Task 9: Weryfikacja końcowa części 1

**Files:** brak nowych.

- [ ] **Step 1: Pełny build**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: build przechodzi bez błędów.

- [ ] **Step 2: Ręczna lista kontrolna (dev + incognito)**

1. `/admin` bez logowania → przekierowanie na `/admin/sign-in`; logowanie działa; `UserButton` wylogowuje.
2. Mutacja bez logowania jest odrzucana: w oknie incognito w konsoli przeglądarki wykonanie mutacji Convex (np. przez devtools na stronie głównej) zwraca „Brak autoryzacji" — wystarczy sprawdzić, że strona publiczna nie wywołuje mutacji, a `/admin/*` jest niedostępne.
3. Pełny flow live: dodaj → podgląd → rozpocznij → sekcja na `/` → zakończ → sekcja znika → „Zapisz przy meczu" → link widoczny na `/wyniki`.
4. CRUD meczów: dodanie, edycja wyniku, filtry, usunięcie.
5. Istniejące strony publiczne (`/`, `/wyniki`, `/druzyny`, `/aktualnosci`) działają bez regresji.

- [ ] **Step 3: Commit końcowy (jeśli były poprawki) i push**

```bash
git push origin main
```

Vercel: deploy przejdzie tylko jeśli zmienne z Task 0 krok 6 są ustawione.
