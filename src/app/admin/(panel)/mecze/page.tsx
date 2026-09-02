"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/convexError";

type SyncResults = FunctionReturnType<
  typeof api.matchesSync.triggerSync
>["results"];

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
  dateConfirmed: boolean;
  roundLabel: string;
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
  dateConfirmed: true,
  roundLabel: "",
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
  // Snapshot z chwili otwarcia edycji - zapis wysyła tylko pola faktycznie
  // zmienione, żeby nie nadpisać danych dogranych w międzyczasie przez sync.
  const [snapshot, setSnapshot] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncResults | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const teams = useQuery(api.teams.list, {});
  const matches = useQuery(api.matches.adminList, {
    teamId: filterTeam ? (filterTeam as Id<"teams">) : undefined,
    status: filterStatus ? (filterStatus as MatchStatus) : undefined,
  });
  const autoSync = useQuery(api.appSettings.getAutoSync, {});
  const createManual = useMutation(api.matches.createManual);
  const updateMatch = useMutation(api.matches.update);
  const removeMatch = useMutation(api.matches.removeMatch);
  const setAutoSync = useMutation(api.appSettings.setAutoSync);
  const triggerSync = useAction(api.matchesSync.triggerSync);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openNew() {
    setForm(emptyForm);
    setSnapshot(null);
    setEditingId("new");
    setError(null);
  }

  function openEdit(match: Doc<"matches">) {
    const state: FormState = {
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
      // Brak pola = termin potwierdzony (mecze sprzed terminów orientacyjnych).
      dateConfirmed: match.dateConfirmed !== false,
      roundLabel: match.roundLabel ?? "",
    };
    setForm(state);
    setSnapshot(state);
    setEditingId(match._id);
    setError(null);
  }

  async function handleSave() {
    if (isSaving) return;
    setError(null);
    const timestamp = new Date(form.date).getTime();
    if (!form.date || Number.isNaN(timestamp)) {
      setError("Podaj poprawną datę meczu");
      return;
    }
    setIsSaving(true);
    try {
      if (editingId === "new") {
        await createManual({
          homeTeam: form.homeTeam,
          awayTeam: form.awayTeam,
          date: timestamp,
          venue: form.venue || undefined,
          matchType: form.matchType,
          status: form.status,
          teamId: form.teamId ? (form.teamId as Id<"teams">) : undefined,
          result: form.result || undefined,
        });
      } else if (editingId && snapshot) {
        // Diff względem snapshotu: wysyłamy wyłącznie pola zmienione przez
        // admina. Pole wyczyszczone (było niepuste) idzie jako null.
        const changed = <T,>(key: keyof FormState, value: T, cleared: T) =>
          form[key] === snapshot[key] ? {} : form[key] ? value : cleared;

        await updateMatch({
          id: editingId,
          ...changed("homeTeam", { homeTeam: form.homeTeam }, {}),
          ...changed("awayTeam", { awayTeam: form.awayTeam }, {}),
          ...(form.date !== snapshot.date ? { date: timestamp } : {}),
          ...changed("venue", { venue: form.venue }, { venue: null }),
          ...(form.matchType !== snapshot.matchType
            ? { matchType: form.matchType }
            : {}),
          ...(form.status !== snapshot.status ? { status: form.status } : {}),
          ...changed(
            "teamId",
            { teamId: form.teamId as Id<"teams"> },
            { teamId: null },
          ),
          ...changed("result", { result: form.result }, { result: null }),
          ...changed("veoUrl", { veoUrl: form.veoUrl }, { veoUrl: null }),
          ...changed(
            "youtubeUrl",
            { youtubeUrl: form.youtubeUrl },
            { youtubeUrl: null },
          ),
          ...(form.dateConfirmed !== snapshot.dateConfirmed ||
          form.date !== snapshot.date
            ? { dateConfirmed: form.dateConfirmed }
            : {}),
          ...changed(
            "roundLabel",
            { roundLabel: form.roundLabel },
            { roundLabel: null },
          ),
        });
      }
      setEditingId(null);
      setSnapshot(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: Id<"matches">) {
    if (!window.confirm("Usunąć ten mecz? Tej operacji nie można cofnąć.")) {
      return;
    }
    setError(null);
    try {
      await removeMatch({ id });
      if (editingId === id) setEditingId(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleAutoSyncChange(enabled: boolean) {
    setSyncError(null);
    try {
      await setAutoSync({ enabled });
    } catch (err) {
      setSyncError(
        err instanceof Error
          ? err.message
          : "Nie udało się zapisać ustawienia synchronizacji",
      );
    }
  }

  async function handleSyncNow() {
    setIsSyncing(true);
    setSyncError(null);
    setSyncResults(null);
    try {
      const outcome = await triggerSync({});
      setSyncResults(outcome.results);
    } catch (err) {
      setSyncError(
        err instanceof Error ? err.message : "Synchronizacja się nie powiodła",
      );
    } finally {
      setIsSyncing(false);
    }
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

      {error ? (
        <p className="mt-4 rounded-md bg-red-500/15 px-4 py-2 text-sm font-bold text-red-300">
          {error}
        </p>
      ) : null}

      {editingId ? (
        <section className="mt-6 rounded-lg border border-border bg-card p-5">
          <h2 className="text-lg font-black text-navy">
            {editingId === "new" ? "Nowy mecz" : "Edycja meczu"}
          </h2>
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
                onChange={(event) => {
                  // Ręczna zmiana daty = admin zna realny termin.
                  setForm((prev) => ({
                    ...prev,
                    date: event.target.value,
                    dateConfirmed: true,
                  }));
                }}
                className={inputClass}
              />
              {editingId !== "new" ? (
                <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={form.dateConfirmed}
                    onChange={(event) =>
                      set("dateConfirmed", event.target.checked)
                    }
                  />
                  Termin potwierdzony (odznacz, jeśli godzina jest orientacyjna)
                </span>
              ) : null}
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
                <option value="">Brak przypisania</option>
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
                  Opis kolejki (termin orientacyjny)
                  <input
                    value={form.roundLabel}
                    onChange={(event) => set("roundLabel", event.target.value)}
                    placeholder="5. kolejka, 6-7 września"
                    className={inputClass}
                  />
                </label>
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
            <Button
              onClick={handleSave}
              disabled={isSaving || !form.homeTeam || !form.awayTeam}
            >
              {isSaving ? "Zapisywanie…" : "Zapisz"}
            </Button>
            <Button variant="ghost" onClick={() => setEditingId(null)}>
              Anuluj
            </Button>
          </div>
        </section>
      ) : null}

      <section className="mt-6 rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-navy">Synchronizacja</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Mecze i tabele pobierane ze źródeł skonfigurowanych w module
              Drużyny.
            </p>
          </div>
          <Button onClick={handleSyncNow} disabled={isSyncing}>
            {isSyncing ? "Synchronizuję…" : "Synchronizuj teraz"}
          </Button>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={autoSync ?? false}
            disabled={autoSync === undefined}
            onChange={(event) => handleAutoSyncChange(event.target.checked)}
          />
          Synchronizacja automatyczna (co 6 godzin)
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          Przycisk „Synchronizuj teraz” działa niezależnie od tego ustawienia.
        </p>

        {syncError ? (
          <p className="mt-4 rounded-md bg-red-500/15 px-4 py-2 text-sm font-bold text-red-300">
            {syncError}
          </p>
        ) : null}

        {syncResults ? (
          syncResults.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Brak włączonych źródeł. Dodaj je w module Drużyny.
            </p>
          ) : (
            <ul className="mt-4 grid gap-2">
              {syncResults.map((result) => (
                <li
                  key={result.sourceId}
                  className="rounded-md border border-border bg-background px-3 py-2"
                >
                  <p className="break-all font-mono text-xs text-muted-foreground">
                    {result.url}
                  </p>
                  {result.error ? (
                    <p className="mt-1 text-sm font-bold text-red-300">
                      {result.error}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm font-bold text-navy">
                      Zapisane mecze: {result.upserted}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )
        ) : null}
      </section>

      <div className="mt-6 grid gap-3">
        {(matches ?? []).map((match) => (
          <article
            key={match._id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4"
          >
            <div className="min-w-0">
              <p className="font-black text-navy">
                {match.homeTeam} vs {match.awayTeam}
                {match.result ? (
                  <span className="ml-2 rounded-md bg-primary px-2 py-0.5 text-sm text-primary-foreground">
                    {match.result}
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDate(match.date)}
                {match.dateConfirmed === false ? (
                  <span className="ml-2 rounded-full bg-[var(--surface-raised)] px-2 py-0.5 font-bold text-accent">
                    termin orientacyjny{match.roundLabel ? `: ${match.roundLabel}` : ""}
                  </span>
                ) : null}{" "}
                · {typeLabels[match.matchType]} ·{" "}
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
