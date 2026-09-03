"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  ListPlus,
  Search,
  SearchX,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { Suspense, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";

import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { AdminEditorDialog } from "@/components/admin/AdminEditorDialog";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Field, Feedback, inputClass } from "@/components/admin/fields";
import { FileUpload } from "@/components/admin/FileUpload";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/convexError";
import { parseRosterList } from "@/lib/rosterList";
import {
  getRosterTeamGroup,
  matchesRosterSearch,
  rosterTeamGroups,
} from "@/lib/rosterWorkspace";

type FormState = {
  name: string;
  number: string;
  teamId: string;
  photoStorageId: Id<"_storage"> | "";
};

const emptyForm: FormState = {
  name: "",
  number: "",
  teamId: "",
  photoStorageId: "",
};

function playerCountLabel(count: number) {
  return `${count} ${count === 1 ? "zawodnik" : "zawodników"}`;
}

function playerInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return [parts[0]?.[0], parts.at(-1)?.[0]]
    .filter(Boolean)
    .join("")
    .toLocaleUpperCase("pl-PL");
}

function RosterWorkspaceSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="mt-6"
    >
      <span className="sr-only">Wczytywanie kadr</span>
      <div
        aria-hidden="true"
        className="h-24 animate-pulse rounded-xl border border-border bg-card motion-reduce:animate-none xl:hidden"
      />
      <div
        aria-hidden="true"
        className="mt-5 grid animate-pulse gap-5 motion-reduce:animate-none xl:mt-0 xl:grid-cols-[280px_minmax(0,1fr)]"
      >
        <div className="hidden h-[560px] rounded-xl border border-border bg-card xl:block" />
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="h-32 border-b border-border bg-[#f9fbfc]" />
          <div className="h-20 border-b border-border bg-card" />
          <div className="grid gap-px bg-border">
            {[0, 1, 2, 3, 4].map((item) => (
              <div key={item} className="h-20 bg-card" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminSquadsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const players = useQuery(api.players.adminList);
  const teams = useQuery(api.teams.list, {});
  const createPlayer = useMutation(api.players.create);
  const createMany = useMutation(api.players.createMany);
  const updatePlayer = useMutation(api.players.update);
  const removePlayer = useMutation(api.players.removePlayer);
  const reorder = useMutation(api.players.reorder);
  const removeUpload = useMutation(api.files.removeUpload);

  const [editingId, setEditingId] = useState<Id<"players"> | "new" | null>(
    null,
  );
  const [bulkOpen, setBulkOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [bulkTeamId, setBulkTeamId] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [playerBusy, setPlayerBusy] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [reorderingId, setReorderingId] = useState<Id<"players"> | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [search, setSearch] = useState("");
  const [editorSession, setEditorSession] = useState(0);
  const activeEditorSessionRef = useRef(0);
  const editorBusy = playerBusy || uploadBusy;

  const rosterByTeam = useMemo(() => {
    type Player = NonNullable<typeof players>[number];
    const result = new Map<string, Player[]>();

    for (const team of teams ?? []) result.set(team._id, []);
    for (const player of players ?? []) {
      const teamPlayers = result.get(player.teamId);
      if (teamPlayers) teamPlayers.push(player);
    }

    return result;
  }, [players, teams]);

  const teamEntries = useMemo(
    () =>
      (teams ?? []).map((team) => ({
        team,
        items: rosterByTeam.get(team._id) ?? [],
      })),
    [rosterByTeam, teams],
  );

  const teamSections = useMemo(
    () =>
      rosterTeamGroups
        .map((group) => ({
          ...group,
          entries: teamEntries.filter(
            ({ team }) => getRosterTeamGroup(team) === group.key,
          ),
        }))
        .filter((section) => section.entries.length > 0),
    [teamEntries],
  );

  const requestedTeamSlug = searchParams.get("team");
  const activeEntry =
    teamEntries.find(({ team }) => team.slug === requestedTeamSlug) ??
    teamEntries.find(({ items }) => items.length > 0) ??
    teamEntries[0] ??
    null;
  const activeTeam = activeEntry?.team ?? null;
  const activePlayers = activeEntry?.items ?? [];
  const filteredPlayers = activePlayers.filter((player) =>
    matchesRosterSearch(player, search),
  );
  const bulkPreview = useMemo(() => parseRosterList(bulkText), [bulkText]);
  const playersWithPhotos = activePlayers.filter(
    (player) => Boolean(player.photoUrl),
  ).length;
  const hasSearch = search.trim().length > 0;
  const loading = players === undefined || teams === undefined;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetFeedback() {
    setError(null);
    setMessage(null);
  }

  function changeTeam(slug: string) {
    setSearch("");
    router.replace(`/admin/kadry?team=${encodeURIComponent(slug)}`, {
      scroll: false,
    });
  }

  function removePendingUpload(storageId: Id<"_storage">) {
    void removeUpload({ storageId }).catch((err) => {
      setError(errorMessage(err));
    });
  }

  function beginEditorSession() {
    activeEditorSessionRef.current += 1;
    setEditorSession(activeEditorSessionRef.current);
  }

  function handlePhotoUploaded(ids: Id<"_storage">[], session: number) {
    const nextPhotoId = ids[0];
    if (!nextPhotoId) return;
    if (activeEditorSessionRef.current !== session) {
      for (const storageId of ids) removePendingUpload(storageId);
      return;
    }
    if (form.photoStorageId && form.photoStorageId !== nextPhotoId) {
      removePendingUpload(form.photoStorageId);
    }
    set("photoStorageId", nextPhotoId);
    setPhotoRemoved(false);
  }

  function openNewPlayer() {
    if (!activeTeam) return;
    setForm({ ...emptyForm, teamId: activeTeam._id });
    setExistingPhotoUrl(null);
    setPhotoRemoved(false);
    beginEditorSession();
    setEditingId("new");
    resetFeedback();
  }

  function openBulkImport() {
    if (!activeTeam) return;
    setBulkTeamId(activeTeam._id);
    setBulkText("");
    setBulkOpen(true);
    resetFeedback();
  }

  function handleEditorCancel() {
    const pendingPhotoId = form.photoStorageId;
    activeEditorSessionRef.current += 1;
    setEditingId(null);
    setForm(emptyForm);
    setExistingPhotoUrl(null);
    setPhotoRemoved(false);
    setError(null);
    if (pendingPhotoId) removePendingUpload(pendingPhotoId);
  }

  function handleBulkCancel() {
    setBulkOpen(false);
    setBulkTeamId("");
    setBulkText("");
    setError(null);
  }

  async function handleReorder(id: Id<"players">, direction: "up" | "down") {
    if (hasSearch || reorderingId) return;
    resetFeedback();
    setReorderingId(id);
    try {
      await reorder({ id, direction });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setReorderingId(null);
    }
  }

  async function handleSave() {
    if (editorBusy) return;
    resetFeedback();
    setPlayerBusy(true);
    activeEditorSessionRef.current += 1;
    const wasNew = editingId === "new";
    const savedName = form.name.trim();
    const targetTeam = teams?.find((team) => team._id === form.teamId);

    try {
      if (wasNew) {
        if (!form.teamId) throw new Error("Wybierz drużynę");
        await createPlayer({
          name: form.name,
          number: form.number || undefined,
          teamId: form.teamId as Id<"teams">,
          photoStorageId: form.photoStorageId || undefined,
        });
      } else if (editingId) {
        await updatePlayer({
          id: editingId,
          name: form.name,
          number: form.number || null,
          ...(form.teamId ? { teamId: form.teamId as Id<"teams"> } : {}),
          ...(form.photoStorageId
            ? { photoStorageId: form.photoStorageId }
            : photoRemoved
              ? { photoStorageId: null }
              : {}),
        });
      }

      setEditingId(null);
      setForm(emptyForm);
      setExistingPhotoUrl(null);
      setPhotoRemoved(false);
      setMessage(
        wasNew
          ? `Dodano zawodnika: ${savedName}.`
          : `Zapisano zmiany: ${savedName}.`,
      );
      if (targetTeam) changeTeam(targetTeam.slug);
    } catch (err) {
      beginEditorSession();
      setError(errorMessage(err));
    } finally {
      setPlayerBusy(false);
    }
  }

  async function handleBulkImport() {
    if (bulkBusy) return;
    resetFeedback();
    setBulkBusy(true);
    const targetTeam = teams?.find((team) => team._id === bulkTeamId);

    try {
      if (!bulkTeamId) throw new Error("Wybierz drużynę do importu");
      const count = await createMany({
        teamId: bulkTeamId as Id<"teams">,
        entries: bulkPreview,
      });
      setBulkOpen(false);
      setBulkText("");
      setBulkTeamId("");
      setMessage(
        `Dodano ${playerCountLabel(count)}${
          targetTeam ? ` do drużyny ${targetTeam.name}` : ""
        }.`,
      );
      if (targetTeam) changeTeam(targetTeam.slug);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleRemove(id: Id<"players">, name: string) {
    resetFeedback();
    if (
      !window.confirm(
        `Usunąć zawodnika ${name}? Zdjęcie też zostanie skasowane.`,
      )
    ) {
      return;
    }
    try {
      await removePlayer({ id });
      setMessage(`Usunięto zawodnika: ${name}.`);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Kadry"
        description="Wybierz drużynę i zarządzaj tylko jej zawodnikami. Pusta kadra pozostawia na stronie drużyny komunikat o danych w przygotowaniu."
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={openBulkImport}
              disabled={loading || !activeTeam}
            >
              <ListPlus aria-hidden="true" size={17} strokeWidth={1.8} />
              Importuj listę
            </Button>
            <Button
              type="button"
              onClick={openNewPlayer}
              disabled={loading || !activeTeam}
            >
              <UserPlus aria-hidden="true" size={17} strokeWidth={1.8} />
              Dodaj zawodnika
            </Button>
          </>
        }
      />

      <Feedback
        error={editingId !== null || bulkOpen ? null : error}
        message={message}
      />

      <AdminEditorDialog
        open={editingId !== null}
        onClose={handleEditorCancel}
        title={editingId === "new" ? "Nowy zawodnik" : "Edycja zawodnika"}
        description={
          editingId === "new"
            ? "Dodaj zawodnika do wybranej drużyny."
            : "Zmień dane zawodnika bez opuszczania aktywnej kadry."
        }
        size="lg"
        busy={editorBusy}
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={handleEditorCancel}
              disabled={editorBusy}
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              form="player-editor-form"
              disabled={editorBusy || !form.name || !form.teamId}
            >
              {playerBusy
                ? "Zapisywanie…"
                : uploadBusy
                  ? "Wysyłanie…"
                  : "Zapisz"}
            </Button>
          </>
        }
      >
        <form
          id="player-editor-form"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <Feedback error={error} />
          <fieldset
            disabled={editorBusy}
            className="mt-4 grid min-w-0 gap-4 border-0 p-0 md:grid-cols-3"
          >
            <Field label="Imię i nazwisko">
              <input
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
                autoComplete="name"
                required
                className={inputClass}
              />
            </Field>
            <Field label="Numer (opcjonalnie)">
              <input
                value={form.number}
                onChange={(event) => set("number", event.target.value)}
                inputMode="numeric"
                placeholder="10"
                className={inputClass}
              />
            </Field>
            <Field label="Drużyna">
              <select
                value={form.teamId}
                onChange={(event) => set("teamId", event.target.value)}
                required
                className={inputClass}
              >
                <option value="">Wybierz drużynę</option>
                {teamSections.map((section) => (
                  <optgroup key={section.key} label={section.label}>
                    {section.entries.map(({ team }) => (
                      <option key={team._id} value={team._id}>
                        {team.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Field>
            <div className="md:col-span-3">
              {existingPhotoUrl && !photoRemoved && !form.photoStorageId ? (
                <div className="mb-3 flex items-center gap-3">
                  <Image
                    src={existingPhotoUrl}
                    alt="Aktualne zdjęcie zawodnika"
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setPhotoRemoved(true)}
                  >
                    Usuń zdjęcie
                  </Button>
                </div>
              ) : null}
              {photoRemoved ? (
                <p className="mb-3 text-xs text-muted-foreground">
                  Zdjęcie zostanie usunięte przy zapisie.
                </p>
              ) : null}
              <FileUpload
                label="Zdjęcie (obraz, max 10 MB)"
                accept="image/*"
                onBusyChange={setUploadBusy}
                onUploaded={(ids) => handlePhotoUploaded(ids, editorSession)}
              />
            </div>
          </fieldset>
        </form>
      </AdminEditorDialog>

      <AdminEditorDialog
        open={bulkOpen}
        onClose={handleBulkCancel}
        title="Import listy zawodników"
        description="Wklej listę i dodaj całą kadrę do jednej drużyny."
        size="md"
        busy={bulkBusy}
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={handleBulkCancel}
              disabled={bulkBusy}
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              form="bulk-roster-form"
              disabled={
                bulkBusy || !bulkTeamId || bulkPreview.length === 0
              }
            >
              {bulkBusy ? "Importowanie…" : "Importuj"}
            </Button>
          </>
        }
      >
        <form
          id="bulk-roster-form"
          onSubmit={(event) => {
            event.preventDefault();
            void handleBulkImport();
          }}
        >
          <Feedback error={error} />
          <fieldset
            disabled={bulkBusy}
            className="mt-4 grid min-w-0 gap-4 border-0 p-0"
          >
            <Field label="Drużyna">
              <select
                value={bulkTeamId}
                onChange={(event) => setBulkTeamId(event.target.value)}
                required
                className={inputClass}
              >
                <option value="">Wybierz drużynę</option>
                {teamSections.map((section) => (
                  <optgroup key={section.key} label={section.label}>
                    {section.entries.map(({ team }) => (
                      <option key={team._id} value={team._id}>
                        {team.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Field>
            <Field label="Lista zawodników">
              <textarea
                value={bulkText}
                onChange={(event) => setBulkText(event.target.value)}
                rows={9}
                placeholder={
                  "1 Bartosz Golder\n10 Patryk Tarkowski\nKarol Nguyen"
                }
                className={inputClass}
              />
            </Field>
          </fieldset>
          <p
            role="status"
            aria-live="polite"
            className="mt-3 text-xs leading-5 text-muted-foreground"
          >
            {bulkPreview.length > 0
              ? `Rozpoznano ${bulkPreview.length} linii, w tym ${
                  bulkPreview.filter((entry) => entry.number).length
                } z numerem.`
              : "Jeden zawodnik w linii. Numer na początku jest opcjonalny."}
          </p>
        </form>
      </AdminEditorDialog>

      {loading ? (
        <RosterWorkspaceSkeleton />
      ) : teams.length === 0 ? (
        <section className="mt-6 rounded-xl border border-border bg-card px-5 py-12 text-center">
          <UsersRound
            aria-hidden="true"
            size={28}
            strokeWidth={1.7}
            className="mx-auto text-[#627286]"
          />
          <h2 className="mt-3 text-lg font-black text-navy">
            Najpierw dodaj drużynę
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            Kadra zawsze należy do konkretnej drużyny. Utwórz ją w module
            drużyn, a potem wróć tutaj.
          </p>
          <Button asChild variant="secondary" className="mt-5">
            <Link href="/admin/druzyny">Przejdź do drużyn</Link>
          </Button>
        </section>
      ) : (
        <div className="mt-6">
          <section
            aria-labelledby="mobile-team-selector"
            className="rounded-xl border border-border bg-card p-4 xl:hidden"
          >
            <label
              id="mobile-team-selector"
              htmlFor="roster-team-select"
              className="text-sm font-bold text-foreground"
            >
              Wybierz drużynę
            </label>
            <div className="relative mt-2">
              <select
                id="roster-team-select"
                value={activeTeam?.slug ?? ""}
                onChange={(event) => changeTeam(event.target.value)}
                className={`${inputClass} appearance-none pr-10 font-bold text-navy`}
              >
                {teamSections.map((section) => (
                  <optgroup key={section.key} label={section.label}>
                    {section.entries.map(({ team, items }) => (
                      <option key={team._id} value={team.slug}>
                        {team.name} ({items.length})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                size={17}
                strokeWidth={1.8}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#627286]"
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Łącznie {playerCountLabel(players.length)} w {teams.length}{" "}
              {teams.length === 1 ? "drużynie" : "drużynach"}.
            </p>
          </section>

          <div className="mt-5 grid min-w-0 gap-5 xl:mt-0 xl:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="hidden self-start overflow-hidden rounded-xl border border-border bg-card xl:sticky xl:top-[100px] xl:block">
              <div className="border-b border-border px-4 py-4">
                <h2 className="text-sm font-black text-navy">
                  Katalog drużyn
                </h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {playerCountLabel(players.length)} w {teams.length}{" "}
                  {teams.length === 1 ? "drużynie" : "drużynach"}
                </p>
              </div>
              <nav
                aria-label="Wybór kadry drużyny"
                className="max-h-[calc(100dvh-250px)] overflow-y-auto p-3"
              >
                {teamSections.map((section) => (
                  <div key={section.key} className="mt-4 first:mt-0">
                    <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      {section.label}
                    </p>
                    <div className="grid gap-1">
                      {section.entries.map(({ team, items }) => {
                        const active = team._id === activeTeam?._id;
                        return (
                          <button
                            key={team._id}
                            type="button"
                            onClick={() => changeTeam(team.slug)}
                            aria-current={active ? "page" : undefined}
                            className={`grid min-h-11 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border-l-2 px-3 py-2 text-left text-sm transition-[background-color,border-color,color] ${
                              active
                                ? "border-secondary bg-[#eaf0f6] text-[#183f63]"
                                : "border-transparent text-[#526275] hover:bg-[#f4f6f8] hover:text-navy"
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-bold">
                                {team.name}
                              </span>
                              {!team.isActive ? (
                                <span className="mt-0.5 block text-[10px] font-semibold text-muted-foreground">
                                  Drużyna ukryta
                                </span>
                              ) : null}
                            </span>
                            <span
                              aria-label={playerCountLabel(items.length)}
                              className={`min-w-7 rounded-md px-1.5 py-1 text-center font-mono text-[11px] font-bold tabular-nums ${
                                active
                                  ? "bg-white text-[#183f63]"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {items.length}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </aside>

            <section
              aria-labelledby="active-roster-heading"
              className="min-w-0 overflow-hidden rounded-xl border border-border bg-card"
            >
              <div className="border-b border-border bg-[#f9fbfc] px-4 py-4 sm:px-5 sm:py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#627286]">
                      Wybrana drużyna
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <h2
                        id="active-roster-heading"
                        className="text-xl font-black text-navy sm:text-2xl"
                      >
                        {activeTeam?.name}
                      </h2>
                      {!activeTeam?.isActive ? (
                        <span className="rounded-md bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">
                          Ukryta
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        <strong className="font-mono font-bold tabular-nums text-navy">
                          {activePlayers.length}
                        </strong>{" "}
                        {activePlayers.length === 1
                          ? "zawodnik"
                          : "zawodników"}
                      </span>
                      <span>
                        <strong className="font-mono font-bold tabular-nums text-navy">
                          {playersWithPhotos}
                        </strong>{" "}
                        ze zdjęciem
                      </span>
                      <span>
                        <strong className="font-mono font-bold tabular-nums text-navy">
                          {activePlayers.length - playersWithPhotos}
                        </strong>{" "}
                        bez zdjęcia
                      </span>
                    </div>
                  </div>

                  {activePlayers.length > 0 ? (
                    <Field label="Szukaj zawodnika">
                      <div className="relative w-full lg:w-72">
                        <Search
                          aria-hidden="true"
                          size={17}
                          strokeWidth={1.8}
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#627286]"
                        />
                        <input
                          id="roster-search"
                          type="search"
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Nazwisko lub numer"
                          className={`${inputClass} pl-10`}
                        />
                      </div>
                    </Field>
                  ) : null}
                </div>
                {hasSearch ? (
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    Znaleziono {filteredPlayers.length} z {activePlayers.length}.
                    Zmiana kolejności jest wyłączona podczas wyszukiwania.
                  </p>
                ) : null}
              </div>

              {activePlayers.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <UsersRound
                    aria-hidden="true"
                    size={28}
                    strokeWidth={1.7}
                    className="mx-auto text-[#627286]"
                  />
                  <h3 className="mt-3 text-base font-black text-navy">
                    Ta drużyna nie ma jeszcze kadry
                  </h3>
                  <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                    Jej publiczna strona pokazuje informację o kadrze w
                    przygotowaniu. Możesz dodać jedną osobę albo wkleić całą
                    listę.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <Button type="button" onClick={openNewPlayer}>
                      <UserPlus
                        aria-hidden="true"
                        size={17}
                        strokeWidth={1.8}
                      />
                      Dodaj zawodnika
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={openBulkImport}
                    >
                      <ListPlus
                        aria-hidden="true"
                        size={17}
                        strokeWidth={1.8}
                      />
                      Importuj listę
                    </Button>
                  </div>
                </div>
              ) : filteredPlayers.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <SearchX
                    aria-hidden="true"
                    size={28}
                    strokeWidth={1.7}
                    className="mx-auto text-[#627286]"
                  />
                  <h3 className="mt-3 text-base font-black text-navy">
                    Brak wyników
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Spróbuj wpisać inne nazwisko albo numer.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSearch("")}
                    className="mt-5"
                  >
                    Wyczyść wyszukiwanie
                  </Button>
                </div>
              ) : (
                <ol className="divide-y divide-border">
                  {filteredPlayers.map((player) => {
                    const playerIndex = activePlayers.findIndex(
                      (item) => item._id === player._id,
                    );
                    const reorderDisabled = hasSearch || reorderingId !== null;

                    return (
                      <li
                        key={player._id}
                        className="grid min-w-0 grid-cols-[48px_minmax(0,1fr)] items-center gap-x-3 gap-y-3 px-4 py-3 sm:grid-cols-[52px_minmax(0,1fr)_auto] sm:px-5"
                      >
                        {player.photoUrl ? (
                          <Image
                            src={player.photoUrl}
                            alt={player.name}
                            width={52}
                            height={52}
                            className="h-12 w-12 rounded-full object-cover sm:h-[52px] sm:w-[52px]"
                          />
                        ) : (
                          <div
                            role="img"
                            aria-label={`Brak zdjęcia: ${player.name}`}
                            className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-xs font-black text-[#526275] sm:h-[52px] sm:w-[52px]"
                          >
                            {playerInitials(player.name)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-black text-navy">
                            {player.name}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {player.number
                              ? `Numer ${player.number}`
                              : "Bez numeru"}
                            {hasSearch ? "" : `, pozycja ${playerIndex + 1}`}
                          </p>
                        </div>
                        <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 sm:col-span-1 sm:justify-end sm:border-0 sm:pt-0">
                          <div
                            role="group"
                            aria-label={`Kolejność: ${player.name}`}
                            className="flex gap-1"
                          >
                            <button
                              type="button"
                              aria-label={`Przesuń wyżej: ${player.name}`}
                              disabled={reorderDisabled || playerIndex === 0}
                              onClick={() =>
                                handleReorder(player._id, "up")
                              }
                              className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-card text-[#526275] transition-[background-color,border-color,color] hover:border-[#aebbc8] hover:bg-muted hover:text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:pointer-events-none disabled:opacity-35"
                            >
                              <ChevronUp
                                aria-hidden="true"
                                size={17}
                                strokeWidth={2}
                              />
                            </button>
                            <button
                              type="button"
                              aria-label={`Przesuń niżej: ${player.name}`}
                              disabled={
                                reorderDisabled ||
                                playerIndex === activePlayers.length - 1
                              }
                              onClick={() =>
                                handleReorder(player._id, "down")
                              }
                              className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-card text-[#526275] transition-[background-color,border-color,color] hover:border-[#aebbc8] hover:bg-muted hover:text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:pointer-events-none disabled:opacity-35"
                            >
                              <ChevronDown
                                aria-hidden="true"
                                size={17}
                                strokeWidth={2}
                              />
                            </button>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setForm({
                                  name: player.name,
                                  number: player.number ?? "",
                                  teamId: player.teamId,
                                  photoStorageId: "",
                                });
                                setExistingPhotoUrl(player.photoUrl ?? null);
                                setPhotoRemoved(false);
                                beginEditorSession();
                                setEditingId(player._id);
                                resetFeedback();
                              }}
                            >
                              Edytuj
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleRemove(player._id, player.name)
                              }
                              className="text-[#a92c23] hover:bg-[#fef3f2]"
                            >
                              Usuń
                            </Button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  );
}

export default function AdminSquadsPage() {
  return (
    <Suspense
      fallback={
        <>
          <AdminPageHeader
            title="Kadry"
            description="Wybierz drużynę i zarządzaj tylko jej zawodnikami."
          />
          <RosterWorkspaceSkeleton />
        </>
      }
    >
      <AdminSquadsWorkspace />
    </Suspense>
  );
}
