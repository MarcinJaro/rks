# Panel admina RKS — część 2: moduły treści (drużyny, ludzie, sponsorzy, galerie, dokumenty, ustawienia) — plan implementacji

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pełny CRUD w panelu admina dla drużyn, ludzi, sponsorów, galerii, dokumentów i ustawień, z uploadem plików do Convex storage.

**Architecture:** Wspólna infrastruktura (generowanie upload URL, komponent `FileUpload`, komponenty formularzy, `slugify`) + jeden moduł na zadanie. Każdy moduł = funkcje admin w istniejącym pliku Convex + strona kliencka w `src/app/admin/(panel)/<moduł>/page.tsx`. Publiczne strony już czytają te tabele, więc zmiany są widoczne natychmiast.

**Tech Stack:** jak część 1 (Next.js 16, React 19, Convex 1.37, Tailwind 4, Clerk).

## Global Constraints

- **Wymaga ukończonej części 1** (`docs/superpowers/plans/2026-08-03-admin-panel-part1-auth-live-matches.md`): istnieje `convex/adminAuth.ts` z `requireAdmin(ctx)`, layout `(panel)` i ochrona Clerk.
- Weryfikacja zadań: `npm run typecheck` + `npm run lint` + ręcznie w przeglądarce (brak frameworka testowego — zgodnie ze specyfikacją).
- Teksty UI po polsku, sentence case.
- KAŻDA funkcja administracyjna Convex zaczyna się od `await requireAdmin(ctx)`.
- Upload: obrazy `image/*` max 10 MB, dokumenty `application/pdf` max 20 MB — walidacja w `FileUpload` przed wysyłką.
- Usuwanie rekordu z plikiem w storage usuwa też plik (`ctx.storage.delete`).
- Commit po każdym zadaniu; stopka: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Infrastruktura uploadu i formularzy

**Files:**
- Create: `convex/files.ts`
- Create: `convex/slugify.ts`
- Create: `src/components/admin/fields.tsx`
- Create: `src/components/admin/FileUpload.tsx`

**Interfaces:**
- Consumes: `requireAdmin` z `convex/adminAuth.ts`.
- Produces (używane przez WSZYSTKIE kolejne zadania):
  - `api.files.generateUploadUrl` — mutacja bez argumentów → string URL.
  - `slugify(text: string): string` z `convex/slugify.ts` (małe litery, polskie znaki → ASCII, `[^a-z0-9]+` → `-`).
  - `Field({ label, children })`, `Feedback({ error?, message? })`, `inputClass` z `@/components/admin/fields`.
  - `FileUpload({ label, accept, maxSizeMb?, multiple?, onUploaded })` z `@/components/admin/FileUpload` — `onUploaded` dostaje ZAWSZE tablicę `Id<"_storage">[]` (przy pojedynczym pliku jednoelementową).

- [ ] **Step 1: Utwórz `convex/files.ts`**

```ts
import { mutation } from "./_generated/server";
import { requireAdmin } from "./adminAuth";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});
```

- [ ] **Step 2: Utwórz `convex/slugify.ts`**

```ts
const polishMap: Record<string, string> = {
  ą: "a",
  ć: "c",
  ę: "e",
  ł: "l",
  ń: "n",
  ó: "o",
  ś: "s",
  ź: "z",
  ż: "z",
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (ch) => polishMap[ch] ?? ch)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
```

- [ ] **Step 3: Utwórz `src/components/admin/fields.tsx`**

```tsx
"use client";

import { ReactNode } from "react";

export const inputClass =
  "rounded-md border border-border bg-background px-3 py-2 font-normal";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm font-bold">
      {label}
      {children}
    </label>
  );
}

export function Feedback({
  error,
  message,
}: {
  error?: string | null;
  message?: string | null;
}) {
  if (error) {
    return (
      <p className="mt-3 rounded-md bg-red-500/15 px-4 py-2 text-sm font-bold text-red-300">
        {error}
      </p>
    );
  }
  if (message) {
    return (
      <p className="mt-3 rounded-md bg-primary/15 px-4 py-2 text-sm font-bold text-primary">
        {message}
      </p>
    );
  }
  return null;
}
```

- [ ] **Step 4: Utwórz `src/components/admin/FileUpload.tsx`**

```tsx
"use client";

import { ChangeEvent, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export function FileUpload({
  label,
  accept,
  maxSizeMb = 10,
  multiple = false,
  onUploaded,
}: {
  label: string;
  accept: string;
  maxSizeMb?: number;
  multiple?: boolean;
  onUploaded: (ids: Id<"_storage">[]) => void;
}) {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setError(null);
    const tooBig = files.find((file) => file.size > maxSizeMb * 1024 * 1024);
    if (tooBig) {
      setError(`Plik ${tooBig.name} przekracza ${maxSizeMb} MB`);
      return;
    }
    setBusy(true);
    try {
      const ids: Id<"_storage">[] = [];
      for (const file of files) {
        const url = await generateUploadUrl();
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!response.ok) throw new Error(`Nie udało się wysłać ${file.name}`);
        const { storageId } = (await response.json()) as {
          storageId: Id<"_storage">;
        };
        ids.push(storageId);
      }
      onUploaded(ids);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd wysyłania pliku");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-1 text-sm font-bold">
      {label}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        disabled={busy}
        className="text-sm font-normal file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-bold file:text-secondary-foreground"
      />
      {busy ? (
        <p className="text-xs font-normal text-muted-foreground">Wysyłanie…</p>
      ) : null}
      {error ? <p className="text-xs font-bold text-red-300">{error}</p> : null}
    </div>
  );
}
```

- [ ] **Step 5: Weryfikacja**

Run: `npx convex dev --once && npm run typecheck && npm run lint`
Expected: bez błędów.

- [ ] **Step 6: Commit**

```bash
git add convex/files.ts convex/slugify.ts src/components/admin
git commit -m "Add admin upload and form infrastructure"
```

---

### Task 2: Moduł „Drużyny"

**Files:**
- Modify: `convex/teams.ts` (nowe funkcje na końcu; import `slugify`)
- Create: `src/app/admin/(panel)/druzyny/page.tsx`

**Interfaces:**
- Consumes: Task 1 (`FileUpload`, `Field`, `Feedback`, `inputClass`, `slugify`, `api.files.generateUploadUrl`), `api.people.listByRole` (istniejące — select trenera).
- Produces:
  - `api.teams.adminList` → drużyny rosnąco po `sortOrder`, każda z `groupPhotoUrl: string | null` i `coach: Doc<"people"> | null`.
  - `api.teams.create({ name, yearGroup?, league?, schedule?, description?, isActive, groupPhotoId?, coachId? })` → id (slug i sortOrder nadawane automatycznie).
  - `api.teams.update({ id, name?, yearGroup?, league?, schedule?, description?, isActive?, groupPhotoId?, coachId? })`.
  - `api.teams.removeTeam({ id })` — czyści `teamId` u powiązanych osób i usuwa zdjęcie ze storage.
  - `api.teams.reorder({ id, direction: "up" | "down" })` — zamiana `sortOrder` z sąsiadem.

- [ ] **Step 1: Dodaj funkcje do `convex/teams.ts`**

Dodaj importy pod istniejącymi (import `requireAdmin` już jest z części 1):

```ts
import type { MutationCtx } from "./_generated/server";
import { slugify } from "./slugify";
```

Na końcu pliku:

```ts
export const adminList = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const teams = await ctx.db
      .query("teams")
      .withIndex("by_sortOrder")
      .order("asc")
      .collect();
    return await Promise.all(
      teams.map(async (team) => ({
        ...team,
        groupPhotoUrl: team.groupPhotoId
          ? await ctx.storage.getUrl(team.groupPhotoId)
          : null,
        coach: team.coachId ? await ctx.db.get(team.coachId) : null,
      })),
    );
  },
});

async function uniqueTeamSlug(ctx: MutationCtx, name: string) {
  const base = slugify(name) || "druzyna";
  let slug = base;
  let counter = 2;
  while (
    await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first()
  ) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
}

export const create = mutation({
  args: {
    name: v.string(),
    yearGroup: v.optional(v.number()),
    league: v.optional(v.string()),
    schedule: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    groupPhotoId: v.optional(v.id("_storage")),
    coachId: v.optional(v.id("people")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!args.name.trim()) throw new Error("Podaj nazwę drużyny");
    const slug = await uniqueTeamSlug(ctx, args.name);
    const all = await ctx.db.query("teams").collect();
    const sortOrder =
      all.reduce((max, team) => Math.max(max, team.sortOrder), 0) + 1;
    return await ctx.db.insert("teams", { ...args, slug, sortOrder });
  },
});

export const update = mutation({
  args: {
    id: v.id("teams"),
    name: v.optional(v.string()),
    yearGroup: v.optional(v.number()),
    league: v.optional(v.string()),
    schedule: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    groupPhotoId: v.optional(v.id("_storage")),
    coachId: v.optional(v.id("people")),
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    const team = await ctx.db.get(id);
    if (!team) throw new Error("Nie znaleziono drużyny");
    if (
      fields.groupPhotoId &&
      team.groupPhotoId &&
      fields.groupPhotoId !== team.groupPhotoId
    ) {
      await ctx.storage.delete(team.groupPhotoId);
    }
    await ctx.db.patch(id, fields);
  },
});

export const removeTeam = mutation({
  args: { id: v.id("teams") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const team = await ctx.db.get(id);
    if (!team) return;
    const members = await ctx.db
      .query("people")
      .withIndex("by_team", (q) => q.eq("teamId", id))
      .collect();
    for (const person of members) {
      await ctx.db.patch(person._id, { teamId: undefined });
    }
    if (team.groupPhotoId) await ctx.storage.delete(team.groupPhotoId);
    await ctx.db.delete(id);
  },
});

export const reorder = mutation({
  args: {
    id: v.id("teams"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, { id, direction }) => {
    await requireAdmin(ctx);
    const team = await ctx.db.get(id);
    if (!team) throw new Error("Nie znaleziono drużyny");
    const all = await ctx.db
      .query("teams")
      .withIndex("by_sortOrder")
      .order("asc")
      .collect();
    const index = all.findIndex((item) => item._id === id);
    const neighborIndex = direction === "up" ? index - 1 : index + 1;
    const neighbor = all[neighborIndex];
    if (!neighbor) return;
    await ctx.db.patch(team._id, { sortOrder: neighbor.sortOrder });
    await ctx.db.patch(neighbor._id, { sortOrder: team.sortOrder });
  },
});
```

Uwaga: `uniqueTeamSlug` to zwykła funkcja pomocnicza (nie query/mutation) — umieść ją PRZED `create`.

- [ ] **Step 2: Utwórz `src/app/admin/(panel)/druzyny/page.tsx`**

```tsx
"use client";

import Image from "next/image";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Field, Feedback, inputClass } from "@/components/admin/fields";
import { FileUpload } from "@/components/admin/FileUpload";

type FormState = {
  name: string;
  yearGroup: string;
  league: string;
  schedule: string;
  description: string;
  isActive: boolean;
  groupPhotoId: Id<"_storage"> | "";
  coachId: string;
};

const emptyForm: FormState = {
  name: "",
  yearGroup: "",
  league: "",
  schedule: "",
  description: "",
  isActive: true,
  groupPhotoId: "",
  coachId: "",
};

export default function AdminTeamsPage() {
  const teams = useQuery(api.teams.adminList);
  const coaches = useQuery(api.people.listByRole, { role: "trener" });
  const createTeam = useMutation(api.teams.create);
  const updateTeam = useMutation(api.teams.update);
  const removeTeam = useMutation(api.teams.removeTeam);
  const reorder = useMutation(api.teams.reorder);

  const [editingId, setEditingId] = useState<Id<"teams"> | "new" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setError(null);
    const fields = {
      name: form.name,
      yearGroup: form.yearGroup ? Number(form.yearGroup) : undefined,
      league: form.league || undefined,
      schedule: form.schedule || undefined,
      description: form.description || undefined,
      isActive: form.isActive,
      groupPhotoId: form.groupPhotoId || undefined,
      coachId: form.coachId ? (form.coachId as Id<"people">) : undefined,
    };
    try {
      if (editingId === "new") {
        await createTeam(fields);
      } else if (editingId) {
        await updateTeam({ id: editingId, ...fields });
      }
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Coś poszło nie tak");
    }
  }

  async function handleDelete(id: Id<"teams">) {
    if (!window.confirm("Usunąć drużynę? Tej operacji nie można cofnąć.")) {
      return;
    }
    await removeTeam({ id });
    if (editingId === id) setEditingId(null);
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black text-navy">Drużyny</h1>
        <Button
          onClick={() => {
            setForm(emptyForm);
            setEditingId("new");
            setError(null);
          }}
        >
          Dodaj drużynę
        </Button>
      </div>

      {editingId ? (
        <section className="mt-6 rounded-lg border border-border bg-card p-5">
          <h2 className="text-lg font-black text-navy">
            {editingId === "new" ? "Nowa drużyna" : "Edycja drużyny"}
          </h2>
          <Feedback error={error} />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Nazwa">
              <input
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Rocznik (np. 2011)">
              <input
                type="number"
                value={form.yearGroup}
                onChange={(event) => set("yearGroup", event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Liga">
              <input
                value={form.league}
                onChange={(event) => set("league", event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Trener">
              <select
                value={form.coachId}
                onChange={(event) => set("coachId", event.target.value)}
                className={inputClass}
              >
                <option value="">— brak —</option>
                {(coaches ?? []).map((coach) => (
                  <option key={coach._id} value={coach._id}>
                    {coach.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Harmonogram treningów">
              <input
                value={form.schedule}
                onChange={(event) => set("schedule", event.target.value)}
                placeholder="wt/czw 17:00, boisko górne"
                className={inputClass}
              />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => set("isActive", event.target.checked)}
              />
              Drużyna aktywna (widoczna na stronie)
            </label>
            <div className="md:col-span-2">
              <Field label="Opis">
                <textarea
                  value={form.description}
                  onChange={(event) => set("description", event.target.value)}
                  rows={3}
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <FileUpload
                label="Zdjęcie grupowe (obraz, max 10 MB)"
                accept="image/*"
                onUploaded={(ids) => set("groupPhotoId", ids[0])}
              />
              {form.groupPhotoId ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Nowe zdjęcie zostanie zapisane po kliknięciu „Zapisz".
                </p>
              ) : null}
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <Button onClick={handleSave} disabled={!form.name}>
              Zapisz
            </Button>
            <Button variant="ghost" onClick={() => setEditingId(null)}>
              Anuluj
            </Button>
          </div>
        </section>
      ) : null}

      <div className="mt-6 grid gap-3">
        {(teams ?? []).map((team, index) => (
          <article
            key={team._id}
            className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4"
          >
            <div className="flex flex-col gap-1">
              <button
                type="button"
                aria-label="Przesuń wyżej"
                disabled={index === 0}
                onClick={() => reorder({ id: team._id, direction: "up" })}
                className="text-muted-foreground disabled:opacity-30"
              >
                ▲
              </button>
              <button
                type="button"
                aria-label="Przesuń niżej"
                disabled={index === (teams?.length ?? 0) - 1}
                onClick={() => reorder({ id: team._id, direction: "down" })}
                className="text-muted-foreground disabled:opacity-30"
              >
                ▼
              </button>
            </div>
            {team.groupPhotoUrl ? (
              <Image
                src={team.groupPhotoUrl}
                alt={team.name}
                width={56}
                height={56}
                className="h-14 w-14 rounded-md object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-md bg-muted text-xs font-black text-muted-foreground">
                brak
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-black text-navy">{team.name}</p>
              <p className="text-xs text-muted-foreground">
                {[
                  team.yearGroup ? `rocznik ${team.yearGroup}` : null,
                  team.league,
                  team.coach ? `trener: ${team.coach.name}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${
                team.isActive
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {team.isActive ? "aktywna" : "ukryta"}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setForm({
                    name: team.name,
                    yearGroup: team.yearGroup ? String(team.yearGroup) : "",
                    league: team.league ?? "",
                    schedule: team.schedule ?? "",
                    description: team.description ?? "",
                    isActive: team.isActive,
                    groupPhotoId: "",
                    coachId: team.coachId ?? "",
                  });
                  setEditingId(team._id);
                  setError(null);
                }}
              >
                Edytuj
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(team._id)}
              >
                Usuń
              </Button>
            </div>
          </article>
        ))}
        {teams && teams.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Brak drużyn — dodaj pierwszą.
          </p>
        ) : null}
      </div>
    </>
  );
}
```

Uwaga: jeśli `next/image` odrzuci domenę Convex storage, dodaj w `next.config.ts` do `images.remotePatterns` wpis `{ protocol: "https", hostname: "*.convex.cloud" }`.

- [ ] **Step 3: Weryfikacja**

Run: `npx convex dev --once && npm run typecheck && npm run lint`
Expected: bez błędów.
Ręcznie: `/admin/druzyny` — dodaj drużynę ze zdjęciem, edytuj, zmień kolejność strzałkami, przełącz aktywność, usuń testową. Sprawdź `/druzyny` (strona publiczna) — zmiany widoczne.

- [ ] **Step 4: Commit**

```bash
git add convex/teams.ts "src/app/admin/(panel)/druzyny"
git commit -m "Add teams admin module"
```

---

### Task 3: Moduł „Ludzie"

**Files:**
- Modify: `convex/people.ts` (importy: dodaj `mutation`; `requireAdmin`; nowe funkcje na końcu)
- Create: `src/app/admin/(panel)/ludzie/page.tsx`

**Interfaces:**
- Consumes: Task 1, `api.teams.list`.
- Produces:
  - `api.people.adminList` → wszyscy posortowani po roli i `sortOrder`, z `photoUrl: string | null`.
  - `api.people.create({ name, role, position?, teamId?, qualifications?, bio?, photoStorageId? })` — `sortOrder` = max+1 w ramach roli.
  - `api.people.update({ id, ... })` (te same pola opcjonalnie).
  - `api.people.removePerson({ id })` — czyści `coachId` w drużynach, usuwa zdjęcie ze storage.
  - `api.people.reorder({ id, direction })` — w ramach tej samej roli.

- [ ] **Step 1: Dodaj funkcje do `convex/people.ts`**

Zmień import na `import { mutation, query } from "./_generated/server";` i dodaj `import { requireAdmin } from "./adminAuth";`. Na końcu pliku:

```ts
const personRole = v.union(
  v.literal("trener"),
  v.literal("zarząd"),
  v.literal("legenda"),
  v.literal("zasłużony"),
);

export const adminList = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const people = await ctx.db.query("people").collect();
    people.sort(
      (a, b) => a.role.localeCompare(b.role) || a.sortOrder - b.sortOrder,
    );
    return await Promise.all(
      people.map(async (person) => ({
        ...person,
        photoUrl: person.photoStorageId
          ? await ctx.storage.getUrl(person.photoStorageId)
          : null,
      })),
    );
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    role: personRole,
    position: v.optional(v.string()),
    teamId: v.optional(v.id("teams")),
    qualifications: v.optional(v.string()),
    bio: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!args.name.trim()) throw new Error("Podaj imię i nazwisko");
    const sameRole = await ctx.db
      .query("people")
      .withIndex("by_role", (q) => q.eq("role", args.role))
      .collect();
    const sortOrder =
      sameRole.reduce((max, person) => Math.max(max, person.sortOrder), 0) + 1;
    return await ctx.db.insert("people", { ...args, sortOrder });
  },
});

export const update = mutation({
  args: {
    id: v.id("people"),
    name: v.optional(v.string()),
    role: v.optional(personRole),
    position: v.optional(v.string()),
    teamId: v.optional(v.id("teams")),
    qualifications: v.optional(v.string()),
    bio: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    const person = await ctx.db.get(id);
    if (!person) throw new Error("Nie znaleziono osoby");
    if (
      fields.photoStorageId &&
      person.photoStorageId &&
      fields.photoStorageId !== person.photoStorageId
    ) {
      await ctx.storage.delete(person.photoStorageId);
    }
    await ctx.db.patch(id, fields);
  },
});

export const removePerson = mutation({
  args: { id: v.id("people") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const person = await ctx.db.get(id);
    if (!person) return;
    const teams = await ctx.db.query("teams").collect();
    for (const team of teams) {
      if (team.coachId === id) {
        await ctx.db.patch(team._id, { coachId: undefined });
      }
    }
    if (person.photoStorageId) await ctx.storage.delete(person.photoStorageId);
    await ctx.db.delete(id);
  },
});

export const reorder = mutation({
  args: {
    id: v.id("people"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, { id, direction }) => {
    await requireAdmin(ctx);
    const person = await ctx.db.get(id);
    if (!person) throw new Error("Nie znaleziono osoby");
    const sameRole = await ctx.db
      .query("people")
      .withIndex("by_role", (q) => q.eq("role", person.role))
      .order("asc")
      .collect();
    const index = sameRole.findIndex((item) => item._id === id);
    const neighbor = sameRole[direction === "up" ? index - 1 : index + 1];
    if (!neighbor) return;
    await ctx.db.patch(person._id, { sortOrder: neighbor.sortOrder });
    await ctx.db.patch(neighbor._id, { sortOrder: person.sortOrder });
  },
});
```

- [ ] **Step 2: Utwórz `src/app/admin/(panel)/ludzie/page.tsx`**

```tsx
"use client";

import Image from "next/image";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Field, Feedback, inputClass } from "@/components/admin/fields";
import { FileUpload } from "@/components/admin/FileUpload";

type PersonRole = Doc<"people">["role"];

const roleLabels: Record<PersonRole, string> = {
  trener: "Trenerzy",
  zarząd: "Zarząd",
  legenda: "Legendy",
  zasłużony: "Zasłużeni",
};

type FormState = {
  name: string;
  role: PersonRole;
  position: string;
  teamId: string;
  qualifications: string;
  bio: string;
  photoStorageId: Id<"_storage"> | "";
};

const emptyForm: FormState = {
  name: "",
  role: "trener",
  position: "",
  teamId: "",
  qualifications: "",
  bio: "",
  photoStorageId: "",
};

export default function AdminPeoplePage() {
  const people = useQuery(api.people.adminList);
  const teams = useQuery(api.teams.list, {});
  const createPerson = useMutation(api.people.create);
  const updatePerson = useMutation(api.people.update);
  const removePerson = useMutation(api.people.removePerson);
  const reorder = useMutation(api.people.reorder);

  const [editingId, setEditingId] = useState<Id<"people"> | "new" | null>(
    null,
  );
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setError(null);
    const fields = {
      name: form.name,
      role: form.role,
      position: form.position || undefined,
      teamId: form.teamId ? (form.teamId as Id<"teams">) : undefined,
      qualifications: form.qualifications || undefined,
      bio: form.bio || undefined,
      photoStorageId: form.photoStorageId || undefined,
    };
    try {
      if (editingId === "new") {
        await createPerson(fields);
      } else if (editingId) {
        await updatePerson({ id: editingId, ...fields });
      }
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Coś poszło nie tak");
    }
  }

  const grouped = (Object.keys(roleLabels) as PersonRole[]).map((role) => ({
    role,
    items: (people ?? []).filter((person) => person.role === role),
  }));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black text-navy">Ludzie</h1>
        <Button
          onClick={() => {
            setForm(emptyForm);
            setEditingId("new");
            setError(null);
          }}
        >
          Dodaj osobę
        </Button>
      </div>

      {editingId ? (
        <section className="mt-6 rounded-lg border border-border bg-card p-5">
          <h2 className="text-lg font-black text-navy">
            {editingId === "new" ? "Nowa osoba" : "Edycja osoby"}
          </h2>
          <Feedback error={error} />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Imię i nazwisko">
              <input
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Rola">
              <select
                value={form.role}
                onChange={(event) =>
                  set("role", event.target.value as PersonRole)
                }
                className={inputClass}
              >
                <option value="trener">Trener</option>
                <option value="zarząd">Zarząd</option>
                <option value="legenda">Legenda</option>
                <option value="zasłużony">Zasłużony</option>
              </select>
            </Field>
            <Field label="Stanowisko / funkcja">
              <input
                value={form.position}
                onChange={(event) => set("position", event.target.value)}
                placeholder="Trener bramkarzy"
                className={inputClass}
              />
            </Field>
            <Field label="Drużyna">
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
            </Field>
            <Field label="Kwalifikacje">
              <input
                value={form.qualifications}
                onChange={(event) => set("qualifications", event.target.value)}
                placeholder="UEFA B"
                className={inputClass}
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Bio">
                <textarea
                  value={form.bio}
                  onChange={(event) => set("bio", event.target.value)}
                  rows={3}
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <FileUpload
                label="Zdjęcie (obraz, max 10 MB)"
                accept="image/*"
                onUploaded={(ids) => set("photoStorageId", ids[0])}
              />
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <Button onClick={handleSave} disabled={!form.name}>
              Zapisz
            </Button>
            <Button variant="ghost" onClick={() => setEditingId(null)}>
              Anuluj
            </Button>
          </div>
        </section>
      ) : null}

      {grouped.map(({ role, items }) => (
        <section key={role} className="mt-8">
          <h2 className="text-lg font-black text-navy">{roleLabels[role]}</h2>
          <div className="mt-3 grid gap-3">
            {items.map((person, index) => (
              <article
                key={person._id}
                className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4"
              >
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    aria-label="Przesuń wyżej"
                    disabled={index === 0}
                    onClick={() =>
                      reorder({ id: person._id, direction: "up" })
                    }
                    className="text-muted-foreground disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label="Przesuń niżej"
                    disabled={index === items.length - 1}
                    onClick={() =>
                      reorder({ id: person._id, direction: "down" })
                    }
                    className="text-muted-foreground disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>
                {person.photoUrl ? (
                  <Image
                    src={person.photoUrl}
                    alt={person.name}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-xs font-black text-muted-foreground">
                    {person.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-black text-navy">{person.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {person.position || "—"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setForm({
                        name: person.name,
                        role: person.role,
                        position: person.position ?? "",
                        teamId: person.teamId ?? "",
                        qualifications: person.qualifications ?? "",
                        bio: person.bio ?? "",
                        photoStorageId: "",
                      });
                      setEditingId(person._id);
                      setError(null);
                    }}
                  >
                    Edytuj
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (window.confirm("Usunąć tę osobę?")) {
                        removePerson({ id: person._id });
                      }
                    }}
                  >
                    Usuń
                  </Button>
                </div>
              </article>
            ))}
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Brak osób.</p>
            ) : null}
          </div>
        </section>
      ))}
    </>
  );
}
```

- [ ] **Step 3: Weryfikacja**

Run: `npx convex dev --once && npm run typecheck && npm run lint`
Expected: bez błędów.
Ręcznie: `/admin/ludzie` — dodaj trenera ze zdjęciem, przypisz do drużyny, zmień kolejność, edytuj, usuń. Sprawdź `/klub/sztab` i `/klub/zarzad`.

- [ ] **Step 4: Commit**

```bash
git add convex/people.ts "src/app/admin/(panel)/ludzie"
git commit -m "Add people admin module"
```

---

### Task 4: Moduł „Sponsorzy"

**Files:**
- Modify: `convex/sponsors.ts` (importy: `mutation`, `requireAdmin`; funkcje na końcu)
- Create: `src/app/admin/(panel)/sponsorzy/page.tsx`

**Interfaces:**
- Consumes: Task 1.
- Produces:
  - `api.sponsors.adminList` → wszyscy (sponsor + partner) z `logoUrl`, posortowani po typie i `sortOrder`.
  - `api.sponsors.create({ name, logoStorageId, url?, type })` — logo WYMAGANE.
  - `api.sponsors.update({ id, name?, logoStorageId?, url?, type? })`.
  - `api.sponsors.removeSponsor({ id })` — usuwa logo ze storage.
  - `api.sponsors.reorder({ id, direction })` — w ramach tego samego typu.

- [ ] **Step 1: Dodaj funkcje do `convex/sponsors.ts`**

Zmień import na `import { mutation, query } from "./_generated/server";`, dodaj `import { requireAdmin } from "./adminAuth";`. Na końcu:

```ts
const sponsorType = v.union(v.literal("sponsor"), v.literal("partner"));

export const adminList = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const sponsors = await ctx.db.query("sponsors").collect();
    sponsors.sort(
      (a, b) => a.type.localeCompare(b.type) || a.sortOrder - b.sortOrder,
    );
    return await Promise.all(
      sponsors.map(async (sponsor) => ({
        ...sponsor,
        logoUrl: await ctx.storage.getUrl(sponsor.logoStorageId),
      })),
    );
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    logoStorageId: v.id("_storage"),
    url: v.optional(v.string()),
    type: sponsorType,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!args.name.trim()) throw new Error("Podaj nazwę sponsora");
    const sameType = await ctx.db
      .query("sponsors")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .collect();
    const sortOrder =
      sameType.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1;
    return await ctx.db.insert("sponsors", { ...args, sortOrder });
  },
});

export const update = mutation({
  args: {
    id: v.id("sponsors"),
    name: v.optional(v.string()),
    logoStorageId: v.optional(v.id("_storage")),
    url: v.optional(v.string()),
    type: v.optional(sponsorType),
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    const sponsor = await ctx.db.get(id);
    if (!sponsor) throw new Error("Nie znaleziono sponsora");
    if (fields.logoStorageId && fields.logoStorageId !== sponsor.logoStorageId) {
      await ctx.storage.delete(sponsor.logoStorageId);
    }
    await ctx.db.patch(id, fields);
  },
});

export const removeSponsor = mutation({
  args: { id: v.id("sponsors") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const sponsor = await ctx.db.get(id);
    if (!sponsor) return;
    await ctx.storage.delete(sponsor.logoStorageId);
    await ctx.db.delete(id);
  },
});

export const reorder = mutation({
  args: {
    id: v.id("sponsors"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, { id, direction }) => {
    await requireAdmin(ctx);
    const sponsor = await ctx.db.get(id);
    if (!sponsor) throw new Error("Nie znaleziono sponsora");
    const sameType = await ctx.db
      .query("sponsors")
      .withIndex("by_type", (q) => q.eq("type", sponsor.type))
      .order("asc")
      .collect();
    const index = sameType.findIndex((item) => item._id === id);
    const neighbor = sameType[direction === "up" ? index - 1 : index + 1];
    if (!neighbor) return;
    await ctx.db.patch(sponsor._id, { sortOrder: neighbor.sortOrder });
    await ctx.db.patch(neighbor._id, { sortOrder: sponsor.sortOrder });
  },
});
```

- [ ] **Step 2: Utwórz `src/app/admin/(panel)/sponsorzy/page.tsx`**

```tsx
"use client";

import Image from "next/image";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Field, Feedback, inputClass } from "@/components/admin/fields";
import { FileUpload } from "@/components/admin/FileUpload";

type FormState = {
  name: string;
  url: string;
  type: "sponsor" | "partner";
  logoStorageId: Id<"_storage"> | "";
};

const emptyForm: FormState = {
  name: "",
  url: "",
  type: "sponsor",
  logoStorageId: "",
};

export default function AdminSponsorsPage() {
  const sponsors = useQuery(api.sponsors.adminList);
  const createSponsor = useMutation(api.sponsors.create);
  const updateSponsor = useMutation(api.sponsors.update);
  const removeSponsor = useMutation(api.sponsors.removeSponsor);
  const reorder = useMutation(api.sponsors.reorder);

  const [editingId, setEditingId] = useState<Id<"sponsors"> | "new" | null>(
    null,
  );
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setError(null);
    try {
      if (editingId === "new") {
        if (!form.logoStorageId) {
          setError("Dodaj logo — jest wymagane");
          return;
        }
        await createSponsor({
          name: form.name,
          url: form.url || undefined,
          type: form.type,
          logoStorageId: form.logoStorageId,
        });
      } else if (editingId) {
        await updateSponsor({
          id: editingId,
          name: form.name,
          url: form.url || undefined,
          type: form.type,
          logoStorageId: form.logoStorageId || undefined,
        });
      }
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Coś poszło nie tak");
    }
  }

  const groups = [
    ["sponsor", "Sponsorzy"],
    ["partner", "Partnerzy"],
  ] as const;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black text-navy">Sponsorzy</h1>
        <Button
          onClick={() => {
            setForm(emptyForm);
            setEditingId("new");
            setError(null);
          }}
        >
          Dodaj sponsora
        </Button>
      </div>

      {editingId ? (
        <section className="mt-6 rounded-lg border border-border bg-card p-5">
          <h2 className="text-lg font-black text-navy">
            {editingId === "new" ? "Nowy sponsor" : "Edycja sponsora"}
          </h2>
          <Feedback error={error} />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Nazwa">
              <input
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Link do strony">
              <input
                value={form.url}
                onChange={(event) => set("url", event.target.value)}
                placeholder="https://..."
                className={inputClass}
              />
            </Field>
            <Field label="Typ">
              <select
                value={form.type}
                onChange={(event) =>
                  set("type", event.target.value as FormState["type"])
                }
                className={inputClass}
              >
                <option value="sponsor">Sponsor</option>
                <option value="partner">Partner</option>
              </select>
            </Field>
            <div className="md:col-span-2">
              <FileUpload
                label="Logo (obraz, max 10 MB)"
                accept="image/*"
                onUploaded={(ids) => set("logoStorageId", ids[0])}
              />
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <Button onClick={handleSave} disabled={!form.name}>
              Zapisz
            </Button>
            <Button variant="ghost" onClick={() => setEditingId(null)}>
              Anuluj
            </Button>
          </div>
        </section>
      ) : null}

      {groups.map(([type, label]) => {
        const items = (sponsors ?? []).filter((item) => item.type === type);
        return (
          <section key={type} className="mt-8">
            <h2 className="text-lg font-black text-navy">{label}</h2>
            <div className="mt-3 grid gap-3">
              {items.map((sponsor, index) => (
                <article
                  key={sponsor._id}
                  className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      aria-label="Przesuń wyżej"
                      disabled={index === 0}
                      onClick={() =>
                        reorder({ id: sponsor._id, direction: "up" })
                      }
                      className="text-muted-foreground disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      aria-label="Przesuń niżej"
                      disabled={index === items.length - 1}
                      onClick={() =>
                        reorder({ id: sponsor._id, direction: "down" })
                      }
                      className="text-muted-foreground disabled:opacity-30"
                    >
                      ▼
                    </button>
                  </div>
                  {sponsor.logoUrl ? (
                    <Image
                      src={sponsor.logoUrl}
                      alt={sponsor.name}
                      width={80}
                      height={40}
                      className="h-10 w-20 rounded bg-white object-contain p-1"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-navy">{sponsor.name}</p>
                    {sponsor.url ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {sponsor.url}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setForm({
                          name: sponsor.name,
                          url: sponsor.url ?? "",
                          type: sponsor.type,
                          logoStorageId: "",
                        });
                        setEditingId(sponsor._id);
                        setError(null);
                      }}
                    >
                      Edytuj
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (window.confirm("Usunąć tego sponsora?")) {
                          removeSponsor({ id: sponsor._id });
                        }
                      }}
                    >
                      Usuń
                    </Button>
                  </div>
                </article>
              ))}
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Brak wpisów.</p>
              ) : null}
            </div>
          </section>
        );
      })}
    </>
  );
}
```

- [ ] **Step 3: Weryfikacja**

Run: `npx convex dev --once && npm run typecheck && npm run lint`
Ręcznie: `/admin/sponsorzy` — dodaj sponsora z logo, zmień typ na partnera, kolejność, usuń. Sprawdź pasek sponsorów na `/`.

- [ ] **Step 4: Commit**

```bash
git add convex/sponsors.ts "src/app/admin/(panel)/sponsorzy"
git commit -m "Add sponsors admin module"
```

---

### Task 5: Moduł „Galerie"

**Files:**
- Modify: `convex/galleries.ts` (importy: `mutation`, `requireAdmin`, `slugify`; funkcje na końcu)
- Create: `src/app/admin/(panel)/galerie/page.tsx`

**Interfaces:**
- Consumes: Task 1 (`FileUpload` z `multiple`), `api.teams.list`.
- Produces:
  - `api.galleries.adminList` → galerie malejąco po dacie, z `imageUrls: (string | null)[]`.
  - `api.galleries.create({ title, date, description?, teamId?, imageIds })` — slug z tytułu (unikalny).
  - `api.galleries.update({ id, title?, date?, description?, teamId? })`.
  - `api.galleries.addImages({ id, imageIds })`.
  - `api.galleries.removeImage({ id, imageId })` — usuwa też plik ze storage.
  - `api.galleries.removeGallery({ id })` — usuwa wszystkie pliki ze storage.

- [ ] **Step 1: Dodaj funkcje do `convex/galleries.ts`**

Zmień import na `import { mutation, query } from "./_generated/server";`, dodaj `import { requireAdmin } from "./adminAuth";` i `import { slugify } from "./slugify";`. Na końcu:

```ts
export const adminList = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const galleries = await ctx.db
      .query("galleries")
      .withIndex("by_date")
      .order("desc")
      .collect();
    return await Promise.all(
      galleries.map(async (gallery) => ({
        ...gallery,
        imageUrls: await Promise.all(
          gallery.imageIds.map((id) => ctx.storage.getUrl(id)),
        ),
      })),
    );
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    date: v.number(),
    description: v.optional(v.string()),
    teamId: v.optional(v.id("teams")),
    imageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!args.title.trim()) throw new Error("Podaj tytuł galerii");
    if (!args.imageIds.length) throw new Error("Dodaj przynajmniej jedno zdjęcie");
    const base = slugify(args.title) || "galeria";
    let slug = base;
    let counter = 2;
    while (
      await ctx.db
        .query("galleries")
        .filter((q) => q.eq(q.field("slug"), slug))
        .first()
    ) {
      slug = `${base}-${counter}`;
      counter += 1;
    }
    return await ctx.db.insert("galleries", { ...args, slug });
  },
});

export const update = mutation({
  args: {
    id: v.id("galleries"),
    title: v.optional(v.string()),
    date: v.optional(v.number()),
    description: v.optional(v.string()),
    teamId: v.optional(v.id("teams")),
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    const gallery = await ctx.db.get(id);
    if (!gallery) throw new Error("Nie znaleziono galerii");
    await ctx.db.patch(id, fields);
  },
});

export const addImages = mutation({
  args: { id: v.id("galleries"), imageIds: v.array(v.id("_storage")) },
  handler: async (ctx, { id, imageIds }) => {
    await requireAdmin(ctx);
    const gallery = await ctx.db.get(id);
    if (!gallery) throw new Error("Nie znaleziono galerii");
    await ctx.db.patch(id, { imageIds: [...gallery.imageIds, ...imageIds] });
  },
});

export const removeImage = mutation({
  args: { id: v.id("galleries"), imageId: v.id("_storage") },
  handler: async (ctx, { id, imageId }) => {
    await requireAdmin(ctx);
    const gallery = await ctx.db.get(id);
    if (!gallery) throw new Error("Nie znaleziono galerii");
    await ctx.storage.delete(imageId);
    await ctx.db.patch(id, {
      imageIds: gallery.imageIds.filter((item) => item !== imageId),
    });
  },
});

export const removeGallery = mutation({
  args: { id: v.id("galleries") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const gallery = await ctx.db.get(id);
    if (!gallery) return;
    for (const imageId of gallery.imageIds) {
      await ctx.storage.delete(imageId);
    }
    await ctx.db.delete(id);
  },
});
```

- [ ] **Step 2: Utwórz `src/app/admin/(panel)/galerie/page.tsx`**

```tsx
"use client";

import Image from "next/image";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Field, Feedback, inputClass } from "@/components/admin/fields";
import { FileUpload } from "@/components/admin/FileUpload";

type FormState = {
  title: string;
  date: string;
  description: string;
  teamId: string;
  imageIds: Id<"_storage">[];
};

const emptyForm: FormState = {
  title: "",
  date: "",
  description: "",
  teamId: "",
  imageIds: [],
};

export default function AdminGalleriesPage() {
  const galleries = useQuery(api.galleries.adminList);
  const teams = useQuery(api.teams.list, {});
  const createGallery = useMutation(api.galleries.create);
  const updateGallery = useMutation(api.galleries.update);
  const addImages = useMutation(api.galleries.addImages);
  const removeImage = useMutation(api.galleries.removeImage);
  const removeGallery = useMutation(api.galleries.removeGallery);

  const [editingId, setEditingId] = useState<Id<"galleries"> | "new" | null>(
    null,
  );
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setError(null);
    const timestamp = form.date ? new Date(form.date).getTime() : Date.now();
    try {
      if (editingId === "new") {
        await createGallery({
          title: form.title,
          date: timestamp,
          description: form.description || undefined,
          teamId: form.teamId ? (form.teamId as Id<"teams">) : undefined,
          imageIds: form.imageIds,
        });
      } else if (editingId) {
        await updateGallery({
          id: editingId,
          title: form.title,
          date: timestamp,
          description: form.description || undefined,
          teamId: form.teamId ? (form.teamId as Id<"teams">) : undefined,
        });
        if (form.imageIds.length) {
          await addImages({ id: editingId, imageIds: form.imageIds });
        }
      }
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Coś poszło nie tak");
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black text-navy">Galerie</h1>
        <Button
          onClick={() => {
            setForm(emptyForm);
            setEditingId("new");
            setError(null);
          }}
        >
          Dodaj galerię
        </Button>
      </div>

      {editingId ? (
        <section className="mt-6 rounded-lg border border-border bg-card p-5">
          <h2 className="text-lg font-black text-navy">
            {editingId === "new" ? "Nowa galeria" : "Edycja galerii"}
          </h2>
          <Feedback error={error} />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Tytuł">
              <input
                value={form.title}
                onChange={(event) => set("title", event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Data">
              <input
                type="date"
                value={form.date}
                onChange={(event) => set("date", event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Drużyna">
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
            </Field>
            <Field label="Opis">
              <input
                value={form.description}
                onChange={(event) => set("description", event.target.value)}
                className={inputClass}
              />
            </Field>
            <div className="md:col-span-2">
              <FileUpload
                label="Zdjęcia (można wybrać wiele, max 10 MB każde)"
                accept="image/*"
                multiple
                onUploaded={(ids) =>
                  set("imageIds", [...form.imageIds, ...ids])
                }
              />
              {form.imageIds.length ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Wysłano {form.imageIds.length} zdjęć — zapiszą się po
                  kliknięciu „Zapisz".
                </p>
              ) : null}
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <Button
              onClick={handleSave}
              disabled={
                !form.title || (editingId === "new" && !form.imageIds.length)
              }
            >
              Zapisz
            </Button>
            <Button variant="ghost" onClick={() => setEditingId(null)}>
              Anuluj
            </Button>
          </div>
        </section>
      ) : null}

      <div className="mt-6 grid gap-4">
        {(galleries ?? []).map((gallery) => (
          <article
            key={gallery._id}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-black text-navy">{gallery.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("pl-PL").format(
                    new Date(gallery.date),
                  )}{" "}
                  · {gallery.imageIds.length} zdjęć
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setForm({
                      title: gallery.title,
                      date: new Date(gallery.date).toISOString().slice(0, 10),
                      description: gallery.description ?? "",
                      teamId: gallery.teamId ?? "",
                      imageIds: [],
                    });
                    setEditingId(gallery._id);
                    setError(null);
                  }}
                >
                  Edytuj
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Usunąć całą galerię wraz ze zdjęciami? Tej operacji nie można cofnąć.",
                      )
                    ) {
                      removeGallery({ id: gallery._id });
                    }
                  }}
                >
                  Usuń
                </Button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {gallery.imageIds.map((imageId, index) => {
                const url = gallery.imageUrls[index];
                if (!url) return null;
                return (
                  <div key={imageId} className="group relative">
                    <Image
                      src={url}
                      alt=""
                      width={96}
                      height={96}
                      className="h-24 w-24 rounded-md object-cover"
                    />
                    <button
                      type="button"
                      aria-label="Usuń zdjęcie"
                      onClick={() => {
                        if (window.confirm("Usunąć to zdjęcie?")) {
                          removeImage({ id: gallery._id, imageId });
                        }
                      }}
                      className="absolute right-1 top-1 hidden rounded bg-black/70 px-1.5 text-xs font-black text-white group-hover:block"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
        {galleries && galleries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak galerii.</p>
        ) : null}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Weryfikacja**

Run: `npx convex dev --once && npm run typecheck && npm run lint`
Ręcznie: `/admin/galerie` — utwórz galerię z 3+ zdjęciami naraz, dodaj kolejne w edycji, usuń jedno zdjęcie, usuń galerię. Sprawdź `/galeria`.

- [ ] **Step 4: Commit**

```bash
git add convex/galleries.ts "src/app/admin/(panel)/galerie"
git commit -m "Add galleries admin module with multi-upload"
```

---

### Task 6: Moduł „Dokumenty"

**Files:**
- Modify: `convex/documents.ts` (importy: `mutation`, `v`, `requireAdmin`; funkcje na końcu)
- Create: `src/app/admin/(panel)/dokumenty/page.tsx`

**Interfaces:**
- Consumes: Task 1.
- Produces:
  - `api.documents.create({ title, category, fileStorageId })` — `sortOrder` = max+1.
  - `api.documents.update({ id, title?, category? })`.
  - `api.documents.removeDocument({ id })` — usuwa plik ze storage.
  - Publiczne `api.documents.list` już istnieje (z `fileUrl`) — panel używa jego.

- [ ] **Step 1: Dodaj funkcje do `convex/documents.ts`**

Zmień importy na:

```ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";
```

Na końcu pliku:

```ts
export const create = mutation({
  args: {
    title: v.string(),
    category: v.string(),
    fileStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!args.title.trim()) throw new Error("Podaj tytuł dokumentu");
    const all = await ctx.db.query("documents").collect();
    const sortOrder =
      all.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1;
    return await ctx.db.insert("documents", { ...args, sortOrder });
  },
});

export const update = mutation({
  args: {
    id: v.id("documents"),
    title: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    const document = await ctx.db.get(id);
    if (!document) throw new Error("Nie znaleziono dokumentu");
    await ctx.db.patch(id, fields);
  },
});

export const removeDocument = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const document = await ctx.db.get(id);
    if (!document) return;
    await ctx.storage.delete(document.fileStorageId);
    await ctx.db.delete(id);
  },
});
```

- [ ] **Step 2: Utwórz `src/app/admin/(panel)/dokumenty/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Field, Feedback, inputClass } from "@/components/admin/fields";
import { FileUpload } from "@/components/admin/FileUpload";

export default function AdminDocumentsPage() {
  const documents = useQuery(api.documents.list);
  const createDocument = useMutation(api.documents.create);
  const updateDocument = useMutation(api.documents.update);
  const removeDocument = useMutation(api.documents.removeDocument);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [fileStorageId, setFileStorageId] = useState<Id<"_storage"> | "">("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<Id<"documents"> | null>(null);

  async function handleSave() {
    setError(null);
    setMessage(null);
    try {
      if (editingId) {
        await updateDocument({ id: editingId, title, category });
        setEditingId(null);
      } else {
        if (!fileStorageId) {
          setError("Dodaj plik PDF");
          return;
        }
        await createDocument({ title, category, fileStorageId });
        setMessage("Dokument dodany");
      }
      setTitle("");
      setCategory("");
      setFileStorageId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Coś poszło nie tak");
    }
  }

  return (
    <>
      <h1 className="text-3xl font-black text-navy">Dokumenty</h1>
      <Feedback error={error} message={message} />

      <section className="mt-6 rounded-lg border border-border bg-card p-5">
        <h2 className="text-lg font-black text-navy">
          {editingId ? "Edycja dokumentu" : "Nowy dokument"}
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Tytuł">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Kategoria">
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Statut, deklaracje, RODO…"
              className={inputClass}
            />
          </Field>
          {!editingId ? (
            <div className="md:col-span-2">
              <FileUpload
                label="Plik PDF (max 20 MB)"
                accept="application/pdf"
                maxSizeMb={20}
                onUploaded={(ids) => setFileStorageId(ids[0])}
              />
              {fileStorageId ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Plik wysłany — zapisze się po kliknięciu „Zapisz".
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="mt-5 flex gap-2">
          <Button onClick={handleSave} disabled={!title || !category}>
            Zapisz
          </Button>
          {editingId ? (
            <Button
              variant="ghost"
              onClick={() => {
                setEditingId(null);
                setTitle("");
                setCategory("");
              }}
            >
              Anuluj
            </Button>
          ) : null}
        </div>
      </section>

      <div className="mt-6 grid gap-3">
        {(documents ?? []).map((document) => (
          <article
            key={document._id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4"
          >
            <div className="min-w-0">
              <p className="font-black text-navy">{document.title}</p>
              <p className="text-xs text-muted-foreground">
                {document.category}
              </p>
            </div>
            <div className="flex gap-2">
              {document.fileUrl ? (
                <Button size="sm" variant="secondary" asChild>
                  <a
                    href={document.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Podgląd
                  </a>
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingId(document._id);
                  setTitle(document.title);
                  setCategory(document.category);
                  setError(null);
                  setMessage(null);
                }}
              >
                Edytuj
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (window.confirm("Usunąć dokument wraz z plikiem?")) {
                    removeDocument({ id: document._id });
                  }
                }}
              >
                Usuń
              </Button>
            </div>
          </article>
        ))}
        {documents && documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak dokumentów.</p>
        ) : null}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Weryfikacja**

Run: `npx convex dev --once && npm run typecheck && npm run lint`
Ręcznie: `/admin/dokumenty` — dodaj PDF, sprawdź „Podgląd", edytuj tytuł, usuń. Sprawdź `/klub/dokumenty`. Plik inny niż PDF musi zostać odrzucony przed wysyłką.

- [ ] **Step 4: Commit**

```bash
git add convex/documents.ts "src/app/admin/(panel)/dokumenty"
git commit -m "Add documents admin module"
```

---

### Task 7: Moduł „Ustawienia"

**Files:**
- Create: `convex/settings.ts`
- Create: `src/app/admin/(panel)/ustawienia/page.tsx`

**Interfaces:**
- Consumes: Task 1 (`Field`, `Feedback`, `inputClass`).
- Produces:
  - `api.settings.list` (admin) → wszystkie wpisy `{ key, value }`.
  - `api.settings.get({ key })` (publiczne) → `string | null`.
  - `api.settings.set({ key, value })` (admin) — upsert po `by_key`.

- [ ] **Step 1: Utwórz `convex/settings.ts`**

```ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("settings").collect();
  },
});

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    return setting?.value ?? null;
  },
});

export const set = mutation({
  args: { key: v.string(), value: v.string() },
  handler: async (ctx, { key, value }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { value });
    } else {
      await ctx.db.insert("settings", { key, value });
    }
  },
});
```

- [ ] **Step 2: Utwórz `src/app/admin/(panel)/ustawienia/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Field, Feedback, inputClass } from "@/components/admin/fields";

const settingFields = [
  ["contact_email", "E-mail kontaktowy"],
  ["contact_phone", "Telefon"],
  ["contact_address", "Adres"],
  ["facebook_url", "Link do Facebooka"],
  ["youtube_url", "Link do kanału YouTube"],
  ["instagram_url", "Link do Instagrama"],
] as const;

export default function AdminSettingsPage() {
  const settings = useQuery(api.settings.list);
  const setSetting = useMutation(api.settings.set);

  const [values, setValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      const loaded: Record<string, string> = {};
      for (const setting of settings) {
        loaded[setting.key] = setting.value;
      }
      setValues((prev) => ({ ...loaded, ...prev }));
    }
  }, [settings]);

  async function handleSave() {
    setError(null);
    setMessage(null);
    try {
      for (const [key] of settingFields) {
        const value = values[key];
        if (value !== undefined) {
          await setSetting({ key, value });
        }
      }
      setMessage("Ustawienia zapisane");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Coś poszło nie tak");
    }
  }

  return (
    <>
      <h1 className="text-3xl font-black text-navy">Ustawienia</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Dane kontaktowe i linki społecznościowe używane na stronie.
      </p>
      <Feedback error={error} message={message} />
      <section className="mt-6 grid max-w-xl gap-4 rounded-lg border border-border bg-card p-5">
        {settingFields.map(([key, label]) => (
          <Field key={key} label={label}>
            <input
              value={values[key] ?? ""}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, [key]: event.target.value }))
              }
              className={inputClass}
            />
          </Field>
        ))}
        <div>
          <Button onClick={handleSave}>Zapisz ustawienia</Button>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 3: Weryfikacja**

Run: `npx convex dev --once && npm run typecheck && npm run lint`
Ręcznie: `/admin/ustawienia` — wpisz wartości, zapisz, odśwież stronę (wartości muszą wrócić z bazy).

- [ ] **Step 4: Commit**

```bash
git add convex/settings.ts "src/app/admin/(panel)/ustawienia"
git commit -m "Add settings admin module"
```

---

### Task 8: Weryfikacja końcowa części 2

**Files:** brak nowych.

- [ ] **Step 1: Pełny build**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: bez błędów.

- [ ] **Step 2: Ręczna lista kontrolna**

1. Każdy moduł panelu: pełny cykl dodaj → edytuj → zmień kolejność (gdzie dotyczy) → usuń.
2. Publiczne strony odzwierciedlają zmiany bez redeployu: `/druzyny`, `/klub/sztab`, `/klub/zarzad`, pasek sponsorów na `/`, `/galeria`, `/klub/dokumenty`.
3. Upload: obraz > 10 MB odrzucony z komunikatem; plik nie-PDF odrzucony w dokumentach.
4. W oknie incognito (bez logowania) żaden adres `/admin/*` nie jest dostępny.

- [ ] **Step 3: Push**

```bash
git push origin main
```
