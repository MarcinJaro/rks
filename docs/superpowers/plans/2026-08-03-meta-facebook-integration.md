# Meta/Facebook Feed Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strona RKS Okęcie pokazuje prawdziwe posty z fanpage'a `rks.okeciewarszawa` (dev i produkcja), a stan synchronizacji jest widoczny w `admin/fb-posts`.

**Architecture:** Istniejący sync Convex↔Graph API zostaje bez zmian funkcjonalnych; dochodzi zapis statusu każdego przebiegu do tabeli `settings` (klucz `fbSyncStatus`), publiczne query do odczytu i karta statusu w adminie. Reszta to provisioning: Convex (dev+prod), token Meta, env vars, Vercel.

**Tech Stack:** Next.js 16 (App Router), Convex 1.37, Tailwind 4, vitest + convex-test (nowe, tylko dla funkcji Convex).

## Global Constraints

- Token `FB_PAGE_ACCESS_TOKEN` NIGDY nie trafia do repo, do planu, do logów ani do rozmowy — wkleja go wyłącznie użytkownik do env vars Convex.
- Repo musi pozostać publiczne (inaczej Vercel blokuje deploye — patrz memory `rks-vercel-deploy-setup`).
- Teksty UI po polsku, zgodnie z resztą strony.
- Po każdym tasku kodowym musi przechodzić: `npm run lint`, `npm run typecheck`, `npm test`.
- Kroki oznaczone **[UŻYTKOWNIK]** wykonuje Marcin (logowania, wklejanie tokena) — agent podaje dokładne komendy/instrukcje i czeka.
- `rksokecie.pl` wskazuje na stary hosting — produkcję weryfikujemy na deploymencie `*.vercel.app` (w przeglądarce; jest za Vercel SSO, curl dostanie 302) albo przez status commita na GitHubie.

---

### Task 1: Zapis statusu synca w Convex (TDD)

**Files:**
- Modify: `package.json` (devDeps + script `test`)
- Create: `vitest.config.ts`
- Create: `convex/test.setup.ts`
- Create: `convex/facebook/sync.test.ts`
- Modify: `convex/facebook/sync.ts`

**Interfaces:**
- Consumes: tabela `settings` (`{ key: string, value: string }`, index `by_key`) z `convex/schema.ts` — bez zmian schematu.
- Produces:
  - `internal.facebook.sync.setSyncStatus` — internalMutation `{ value: string }` (JSON typu `SyncStatus`), upsert pod kluczem `fbSyncStatus`.
  - `api.facebook.sync.getSyncStatus` — publiczne query bez argumentów, zwraca `SyncStatus | null`, gdzie `SyncStatus = { ok: boolean; error?: string; created: number; updated: number; errors: number; at: number }`.
  - `syncFromFacebook` zapisuje status przy KAŻDYM wyjściu (brak env, błąd sieci, błąd API, sukces); kształt zwracanych wartości bez zmian.

- [ ] **Step 1: Zainstaluj framework testowy**

```bash
npm install -D vitest convex-test @edge-runtime/vm
```

- [ ] **Step 2: Dodaj skrypt `test` do package.json**

W `package.json` w `"scripts"` dodaj po `"typecheck"`:

```json
"test": "vitest run"
```

- [ ] **Step 3: Utwórz `vitest.config.ts` w katalogu głównym**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
  },
});
```

- [ ] **Step 4: Utwórz `convex/test.setup.ts`**

```ts
export const modules = import.meta.glob("./**/!(*.*.*)*.*s");
```

(Wzorzec z dokumentacji convex-test — glob pomija pliki z podwójną kropką, więc `*.test.ts` i `test.setup.ts` nie trafiają do modułów.)

- [ ] **Step 5: Napisz failing test — `convex/facebook/sync.test.ts`**

```ts
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "../schema";
import { api, internal } from "../_generated/api";
import { modules } from "../test.setup";

test("getSyncStatus returns null before any sync", async () => {
  const t = convexTest(schema, modules);
  const status = await t.query(api.facebook.sync.getSyncStatus, {});
  expect(status).toBeNull();
});

test("setSyncStatus upserts a single settings row and getSyncStatus parses it", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(internal.facebook.sync.setSyncStatus, {
    value: JSON.stringify({ ok: true, created: 2, updated: 1, errors: 0, at: 111 }),
  });
  await t.mutation(internal.facebook.sync.setSyncStatus, {
    value: JSON.stringify({
      ok: false,
      error: "token expired",
      created: 0,
      updated: 0,
      errors: 0,
      at: 222,
    }),
  });

  const status = await t.query(api.facebook.sync.getSyncStatus, {});
  expect(status).toMatchObject({ ok: false, error: "token expired", at: 222 });

  const rows = await t.run(async (ctx) => {
    return await ctx.db.query("settings").collect();
  });
  expect(rows).toHaveLength(1);
});

test("getSyncStatus returns null for malformed JSON", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(internal.facebook.sync.setSyncStatus, { value: "not-json" });
  const status = await t.query(api.facebook.sync.getSyncStatus, {});
  expect(status).toBeNull();
});
```

- [ ] **Step 6: Uruchom testy — mają FAILOWAĆ**

Run: `npm test`
Expected: FAIL — `getSyncStatus`/`setSyncStatus` nie istnieją w `api.facebook.sync` (błąd typu/undefined function).

- [ ] **Step 7: Implementacja w `convex/facebook/sync.ts`**

7a. Do importu z `../_generated/server` dodaj `query`:

```ts
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "../_generated/server";
```

7b. Pod definicjami typów (`PostType`, `Category`) dodaj:

```ts
const SYNC_STATUS_KEY = "fbSyncStatus";

type SyncStatus = {
  ok: boolean;
  error?: string;
  created: number;
  updated: number;
  errors: number;
  at: number;
};
```

7c. Zmodyfikuj początek handlera `syncFromFacebook` — dodaj helper i zapis statusu przy wyjściach. Fragment od początku handlera do pętli `for` ma wyglądać tak (pętla i jej wnętrze BEZ ZMIAN):

```ts
export const syncFromFacebook = internalAction({
  handler: async (ctx) => {
    const recordStatus = async (status: SyncStatus) => {
      await ctx.runMutation(internal.facebook.sync.setSyncStatus, {
        value: JSON.stringify(status),
      });
    };

    const pageId = process.env.FB_PAGE_ID;
    const accessToken = process.env.FB_PAGE_ACCESS_TOKEN;
    const apiVersion = process.env.FB_GRAPH_API_VERSION || "v22.0";

    if (!pageId || !accessToken) {
      const error =
        "Missing FB_PAGE_ID or FB_PAGE_ACCESS_TOKEN in Convex env vars.";
      await recordStatus({
        ok: false,
        error,
        created: 0,
        updated: 0,
        errors: 0,
        at: Date.now(),
      });
      return { success: false, error };
    }

    const fields = [
      "id",
      "message",
      "story",
      "full_picture",
      "attachments{media,media_type,type,subattachments,url,title,description}",
      "created_time",
      "updated_time",
      "permalink_url",
      "shares",
      "reactions.summary(true)",
      "comments.summary(true)",
    ].join(",");

    const url =
      `https://graph.facebook.com/${apiVersion}/${pageId}/feed` +
      `?fields=${encodeURIComponent(fields)}&limit=25&access_token=${accessToken}`;

    let data;
    try {
      const response = await fetch(url);
      data = await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await recordStatus({
        ok: false,
        error: message,
        created: 0,
        updated: 0,
        errors: 0,
        at: Date.now(),
      });
      return { success: false, error: message };
    }

    if (data.error) {
      console.error("FB API Error:", data.error);
      await recordStatus({
        ok: false,
        error: data.error.message,
        created: 0,
        updated: 0,
        errors: 0,
        at: Date.now(),
      });
      return { success: false, error: data.error.message };
    }
```

7d. Na końcu handlera zamień `return { success: true, created, updated, errors };` na:

```ts
    await recordStatus({ ok: true, created, updated, errors, at: Date.now() });
    return { success: true, created, updated, errors };
```

7e. Po `updatePost` (przed `storeRemoteImage`) dodaj nowe funkcje:

```ts
export const setSyncStatus = internalMutation({
  args: { value: v.string() },
  handler: async (ctx, { value }) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", SYNC_STATUS_KEY))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { value });
    } else {
      await ctx.db.insert("settings", { key: SYNC_STATUS_KEY, value });
    }
  },
});

export const getSyncStatus = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", SYNC_STATUS_KEY))
      .first();
    if (!row) return null;
    try {
      return JSON.parse(row.value) as SyncStatus;
    } catch {
      return null;
    }
  },
});
```

- [ ] **Step 8: Testy mają przechodzić**

Run: `npm test`
Expected: PASS (3 testy).

- [ ] **Step 9: Lint + typecheck**

Run: `npm run lint && npm run typecheck`
Expected: bez błędów.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json vitest.config.ts convex/test.setup.ts convex/facebook/sync.test.ts convex/facebook/sync.ts
git commit -m "Record Facebook sync status in settings and expose getSyncStatus"
```

---

### Task 2: Karta statusu synca w admin/fb-posts

**Files:**
- Create: `src/components/admin/FbSyncStatus.tsx`
- Modify: `src/app/admin/fb-posts/page.tsx`

**Interfaces:**
- Consumes: `api.facebook.sync.getSyncStatus` z Task 1 (query bez argumentów → `SyncStatus | null`; `useQuery` zwraca dodatkowo `undefined` podczas ładowania).
- Produces: komponent `FbSyncStatus` (bez propsów), client component.

- [ ] **Step 1: Utwórz `src/components/admin/FbSyncStatus.tsx`**

Wzorzec identyczny jak `FacebookFeedGrid`: rozdzielenie na komponent statyczny (brak `NEXT_PUBLIC_CONVEX_URL`) i live (hook `useQuery` tylko w komponencie live — bez warunkowych hooków).

```tsx
"use client";

import type { ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function FbSyncStatus() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return (
      <StatusCard tone="muted">
        Brak konfiguracji Convex (NEXT_PUBLIC_CONVEX_URL) — synchronizacja
        z Facebookiem jest nieaktywna, strona pokazuje posty zastępcze.
      </StatusCard>
    );
  }
  return <LiveStatus />;
}

function LiveStatus() {
  const status = useQuery(api.facebook.sync.getSyncStatus, {});

  if (status === undefined) {
    return <StatusCard tone="muted">Ładowanie stanu synchronizacji…</StatusCard>;
  }
  if (status === null) {
    return (
      <StatusCard tone="muted">
        Synchronizacja z Facebookiem jeszcze się nie uruchomiła.
      </StatusCard>
    );
  }

  const when = new Date(status.at).toLocaleString("pl-PL");

  if (!status.ok) {
    return (
      <StatusCard tone="error">
        <strong>Błąd ostatniej synchronizacji</strong> ({when}): {status.error}
      </StatusCard>
    );
  }

  return (
    <StatusCard tone="ok">
      <strong>Ostatnia synchronizacja OK</strong> ({when}) — nowe:{" "}
      {status.created}, zaktualizowane: {status.updated}, błędy postów:{" "}
      {status.errors}.
    </StatusCard>
  );
}

function StatusCard({
  tone,
  children,
}: {
  tone: "ok" | "error" | "muted";
  children: ReactNode;
}) {
  const toneClass =
    tone === "ok"
      ? "border-emerald-500/40 bg-emerald-500/10"
      : tone === "error"
        ? "border-red-500/40 bg-red-500/10"
        : "border-border bg-card";
  return (
    <div className={`rounded-lg border p-6 shadow-sm ${toneClass}`}>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Podepnij kartę w `src/app/admin/fb-posts/page.tsx`**

Cała nowa zawartość pliku:

```tsx
import { PageHeader } from "@/components/shared/PageHeader";
import { FbSyncStatus } from "@/components/admin/FbSyncStatus";

export default function AdminFacebookPostsPage() {
  return (
    <>
      <PageHeader
        title="Moderacja postów FB"
        description="Zarządzanie widocznością, przypięciem i kategoriami postów wyświetlanych na stronie."
      />
      <section className="container-page space-y-6 py-12">
        <FbSyncStatus />
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          Posty można oznaczać jako wyróżnione, ukrywać z widoku publicznego
          oraz przypisywać do drużyn i kategorii tematycznych.
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 3: Lint + typecheck + testy**

Run: `npm run lint && npm run typecheck && npm test`
Expected: bez błędów.

- [ ] **Step 4: Weryfikacja wizualna (fallback bez Convex)**

Uruchom dev server (preview tools / `npm run dev`), otwórz `http://localhost:3000/admin/fb-posts`.
Expected: szara karta „Brak konfiguracji Convex…" (bo `.env.local` jeszcze nie istnieje).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/FbSyncStatus.tsx src/app/admin/fb-posts/page.tsx
git commit -m "Show Facebook sync status in admin fb-posts page"
```

---

### Task 3: Provisioning Convex (dev)

**Files:**
- Create (generowane): `.env.local` (gitignored — NIE commitować)

**Interfaces:**
- Consumes: funkcje z Task 1 (do weryfikacji end-to-end).
- Produces: działający dev deployment Convex z wypchniętymi funkcjami i cronem; `NEXT_PUBLIC_CONVEX_URL` w `.env.local`.

- [ ] **Step 1: [UŻYTKOWNIK] Zaloguj się i utwórz projekt Convex**

```bash
npx convex dev --once
```

Komenda interaktywna: loguje przez przeglądarkę, tworzy/podłącza projekt, generuje `.env.local` z `CONVEX_DEPLOYMENT` i `NEXT_PUBLIC_CONVEX_URL`, wypycha funkcje + crony.

- [ ] **Step 2: Zweryfikuj `.env.local`**

Run: `grep -o '^[A-Z_]*' .env.local`
Expected: `CONVEX_DEPLOYMENT` i `NEXT_PUBLIC_CONVEX_URL`.

- [ ] **Step 3: Zweryfikuj zapis statusu end-to-end (bez tokena)**

```bash
npx convex run facebook/sync:triggerFacebookSync
```

Expected: `{ success: false, error: "Missing FB_PAGE_ID or FB_PAGE_ACCESS_TOKEN in Convex env vars." }`

```bash
npx convex run facebook/sync:getSyncStatus
```

Expected: obiekt `{ ok: false, error: "Missing FB_PAGE_ID...", at: <timestamp> }` — dowód, że status ląduje w `settings`.

- [ ] **Step 4: Weryfikacja karty w adminie**

Dev server + `http://localhost:3000/admin/fb-posts`.
Expected: czerwona karta „Błąd ostatniej synchronizacji … Missing FB_PAGE_ID…".

---

### Task 4: Meta — aplikacja i Page Access Token

**Files:** brak (wszystko w panelach Meta i env vars Convex).

**Interfaces:**
- Produces: env vars na dev deploymencie Convex: `FB_PAGE_ID` (numeryczne ID strony), `FB_PAGE_ACCESS_TOKEN` (długożyjący token strony), `FB_GRAPH_API_VERSION=v22.0`.

Wszystkie kroki tego taska wykonuje **[UŻYTKOWNIK]** (konta, hasła, tokeny). Agent podaje instrukcje i czeka na potwierdzenie.

- [ ] **Step 1: [UŻYTKOWNIK] Utwórz aplikację Meta**

Na https://developers.facebook.com/apps → „Create App" → use case „Other" → typ „Business". Nazwa np. „RKS Okecie Website". App zostaje w trybie Development — to wystarcza dla własnej strony, bez App Review.

- [ ] **Step 2: [UŻYTKOWNIK] Wygeneruj krótkożyjący user token**

Graph API Explorer: https://developers.facebook.com/tools/explorer
1. Wybierz swoją aplikację (prawy górny róg).
2. „Add a permission" → `pages_show_list`, `pages_read_engagement`, `pages_read_user_content`.
3. „Generate Access Token" → zaloguj się, zaznacz stronę RKS Okęcie.

- [ ] **Step 3: [UŻYTKOWNIK] Wymień na długożyjący user token**

W przeglądarce (podstaw własne wartości; App ID i Secret z panelu aplikacji → Settings → Basic):

```txt
https://graph.facebook.com/v22.0/oauth/access_token?grant_type=fb_exchange_token&client_id=<APP_ID>&client_secret=<APP_SECRET>&fb_exchange_token=<KROTKI_TOKEN>
```

Odpowiedź JSON zawiera `access_token` — to długożyjący user token (~60 dni).

- [ ] **Step 4: [UŻYTKOWNIK] Pobierz token strony (praktycznie bezterminowy)**

```txt
https://graph.facebook.com/v22.0/me/accounts?access_token=<DLUGI_USER_TOKEN>
```

W odpowiedzi znajdź stronę RKS Okęcie: zanotuj jej **`id`** (numeryczne — użyjemy jako `FB_PAGE_ID`, bo jest stabilniejsze niż vanity `rks.okeciewarszawa`) oraz **`access_token`** (token strony — wygenerowany z długożyjącego user tokena nie wygasa).

- [ ] **Step 5: [UŻYTKOWNIK] Ustaw env vars w Convex (dev)**

```bash
npx convex env set FB_PAGE_ID <NUMERYCZNE_ID_STRONY>
```

```bash
npx convex env set FB_GRAPH_API_VERSION v22.0
```

```bash
npx convex env set FB_PAGE_ACCESS_TOKEN <TOKEN_STRONY>
```

- [ ] **Step 6: Zweryfikuj obecność zmiennych (bez wartości)**

Run: `npx convex env list | cut -d= -f1`
Expected: lista zawiera `FB_PAGE_ID`, `FB_PAGE_ACCESS_TOKEN`, `FB_GRAPH_API_VERSION`.

---

### Task 5: Pierwszy sync i weryfikacja lokalna

**Files:** brak zmian w kodzie.

**Interfaces:**
- Consumes: Task 1–4.
- Produces: realne posty w tabeli `fbPosts` na dev deploymencie; potwierdzone renderowanie na froncie.

- [ ] **Step 1: Ręczny sync**

```bash
npx convex run facebook/sync:triggerFacebookSync
```

Expected: `{ success: true, created: <N ≥ 1>, updated: 0, errors: 0 }`. Jeśli `success: false` — komunikat błędu wskaże problem (token/uprawnienia/ID strony); wróć do Task 4.

- [ ] **Step 2: Status synca**

```bash
npx convex run facebook/sync:getSyncStatus
```

Expected: `{ ok: true, created: <N>, ... }`.

- [ ] **Step 3: Weryfikacja frontendowa w przeglądarce**

Dev server + kolejno:
- `http://localhost:3000` — sekcja aktualności pokazuje prawdziwe posty (treści z FB, nie fallbacki z `src/data/site.ts`).
- `http://localhost:3000/aktualnosci` — lista prawdziwych postów ze zdjęciami i linkami do FB.
- `http://localhost:3000/admin/fb-posts` — zielona karta „Ostatnia synchronizacja OK".

Expected: wszystkie trzy widoki na danych z Convex. Zrzut ekranu dla użytkownika.

- [ ] **Step 4: Weryfikacja crona**

Po ≥5 min: `npx convex run facebook/sync:getSyncStatus`
Expected: `at` nowsze niż przy ręcznym syncu (cron działa).

---

### Task 6: Produkcja (Convex prod + Vercel)

**Files:** brak zmian w kodzie.

**Interfaces:**
- Consumes: Task 1–5.
- Produces: prod deployment Convex z env vars i danymi; `NEXT_PUBLIC_CONVEX_URL` w Vercel; działająca produkcja.

- [ ] **Step 1: Deploy funkcji na produkcyjny deployment Convex**

```bash
npx convex deploy
```

Expected: sukces + URL produkcyjnego deploymentu (`https://<nazwa>.convex.cloud`) — zanotuj go.

- [ ] **Step 2: [UŻYTKOWNIK] Env vars na produkcji Convex**

```bash
npx convex env set --prod FB_PAGE_ID <NUMERYCZNE_ID_STRONY>
```

```bash
npx convex env set --prod FB_GRAPH_API_VERSION v22.0
```

```bash
npx convex env set --prod FB_PAGE_ACCESS_TOKEN <TOKEN_STRONY>
```

- [ ] **Step 3: Sync na produkcji**

```bash
npx convex run --prod facebook/sync:triggerFacebookSync
```

Expected: `{ success: true, created: <N ≥ 1>, ... }`.

- [ ] **Step 4: [UŻYTKOWNIK] `NEXT_PUBLIC_CONVEX_URL` w Vercel**

Vercel dashboard (konto marcin@creativerebels.pl, projekt RKS) → Settings → Environment Variables → dodaj `NEXT_PUBLIC_CONVEX_URL` = URL z kroku 1, environment: Production. (CLI nie zadziała — lokalny `vercel` jest zalogowany na inne konto, patrz memory.)

- [ ] **Step 5: Redeploy**

Zmienna `NEXT_PUBLIC_*` jest wstrzykiwana w build, więc trzeba przebudować: Vercel dashboard → Deployments → „Redeploy" na ostatnim deploymencie, ALBO push dowolnego commita (np. plan/spec z tej sesji, jeśli jeszcze niewypchnięte).

- [ ] **Step 6: Weryfikacja produkcji**

- Status commita: `gh api repos/MarcinJaro/rks/commits/$(git rev-parse HEAD)/status --jq '.state'` → Expected: `success`.
- Wizualnie: deployment `*.vercel.app` w przeglądarce (za Vercel SSO — zaloguje się użytkownik albo sprawdzimy przez claude-in-chrome za zgodą). Expected: prawdziwe posty na stronie głównej i w `/aktualnosci`.

- [ ] **Step 7: Aktualizacja memory**

Dopisz do memory `rks-vercel-deploy-setup` (lub nowego pliku `rks-meta-integration`): URL prod deploymentu Convex, fakt że env vars FB_* są na dev i prod, data uruchomienia integracji.
