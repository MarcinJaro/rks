"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Field, Feedback, inputClass } from "@/components/admin/fields";
import { errorMessage } from "@/lib/convexError";

type SyncSource = Doc<"syncSources">;
type SourceMatchType = SyncSource["matchType"];

const kindLabels: Record<SyncSource["kind"], string> = {
  ninetyminut: "90minut",
  virium: "virium",
};

const typeLabels = {
  liga: "Liga",
  puchar: "Puchar",
  sparing: "Sparing",
  turniej: "Turniej",
} as const;

type FormState = {
  url: string;
  teamNameOnSource: string;
  matchType: SourceMatchType;
};

const emptyForm: FormState = {
  url: "",
  teamNameOnSource: "",
  matchType: "liga",
};

function formatSyncedAt(timestamp: number | undefined) {
  if (!timestamp) return "brak synchronizacji";
  return `ostatni sync: ${new Date(timestamp).toLocaleString("pl-PL")}`;
}

export function TeamSources({
  teamId,
  embedded = false,
  onBusyChange,
}: {
  teamId: Id<"teams">;
  embedded?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const sources = useQuery(api.syncSources.listByTeam, { teamId });
  const addSource = useMutation(api.syncSources.add);
  const updateSource = useMutation(api.syncSources.update);
  const removeSource = useMutation(api.syncSources.remove);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Edycja pomyłki w nazwie/typie bez kasowania i dodawania źródła od nowa.
  const [editingSourceId, setEditingSourceId] =
    useState<Id<"syncSources"> | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<SourceMatchType>("liga");

  useEffect(() => {
    onBusyChange?.(busy);

    return () => {
      if (busy) onBusyChange?.(false);
    };
  }, [busy, onBusyChange]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleAdd() {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await addSource({
        teamId,
        url: form.url.trim(),
        teamNameOnSource: form.teamNameOnSource.trim(),
        matchType: form.matchType,
      });
      setForm(emptyForm);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleEditSave(sourceId: Id<"syncSources">) {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await updateSource({
        sourceId,
        teamNameOnSource: editName.trim(),
        matchType: editType,
      });
      setEditingSourceId(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleToggle(source: SyncSource) {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await updateSource({ sourceId: source._id, enabled: !source.enabled });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(sourceId: Id<"syncSources">) {
    if (busy) return;
    if (!window.confirm("Usunąć to źródło? Tej operacji nie można cofnąć.")) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await removeSource({ sourceId });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={
        embedded
          ? "mt-6 border-t border-border pt-6"
          : "mt-6 rounded-lg border border-border bg-card p-5"
      }
    >
      <h2 className="text-lg font-black text-navy">Źródła synchronizacji</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Terminarz i wyniki tej drużyny pobierane automatycznie. Zmiany w
        źródłach zapisują się od razu, niezależnie od przycisku Zapisz.
      </p>
      <Feedback error={error} />

      <div className="mt-4 grid gap-3">
        {sources === undefined ? (
          <p className="text-sm text-muted-foreground">Ładowanie źródeł…</p>
        ) : null}

        {sources && sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Brak źródeł. Dodaj pierwsze poniżej.
          </p>
        ) : null}

        {(sources ?? []).map((source) => (
          <article
            key={source._id}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="font-black text-navy">{source.teamNameOnSource}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {kindLabels[source.kind]} · {typeLabels[source.matchType]} ·{" "}
                {formatSyncedAt(source.lastSyncedAt)}
              </p>
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block truncate font-mono text-xs text-muted-foreground underline hover:text-primary"
              >
                {source.url}
              </a>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${
                source.enabled
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {source.enabled ? "włączone" : "wyłączone"}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleToggle(source)}
                disabled={busy}
              >
                {source.enabled ? "Wyłącz" : "Włącz"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingSourceId(source._id);
                  setEditName(source.teamNameOnSource);
                  setEditType(source.matchType);
                  setError(null);
                }}
                disabled={busy}
              >
                Edytuj
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(source._id)}
                disabled={busy}
              >
                Usuń
              </Button>
            </div>
            {editingSourceId === source._id ? (
              <form
                className="w-full"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleEditSave(source._id);
                }}
              >
                <fieldset
                  disabled={busy}
                  className="grid min-w-0 gap-3 rounded-md border border-border p-3 md:grid-cols-3"
                >
                  <Field label="Nazwa drużyny u źródła">
                    <input
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      required
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Typ meczów">
                    <select
                      value={editType}
                      onChange={(event) =>
                        setEditType(event.target.value as SourceMatchType)
                      }
                      className={inputClass}
                    >
                      {Object.entries(typeLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="flex items-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingSourceId(null)}
                    >
                      Anuluj
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!editName.trim()}
                    >
                      {busy ? "Zapisywanie…" : "Zapisz"}
                    </Button>
                  </div>
                </fieldset>
              </form>
            ) : null}
            {source.lastError ? (
              <p className="w-full rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300">
                Błąd ostatniej synchronizacji: {source.lastError}
              </p>
            ) : null}
          </article>
        ))}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleAdd();
        }}
      >
        <fieldset disabled={busy} className="min-w-0 border-0 p-0">
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <Field label="Adres źródła">
                <input
                  value={form.url}
                  onChange={(event) => set("url", event.target.value)}
                  placeholder="http://www.90minut.pl/liga/1/liga14871.html"
                  required
                  className={`${inputClass} font-mono text-sm`}
                />
              </Field>
            </div>
            <Field label="Typ meczów">
              <select
                value={form.matchType}
                onChange={(event) =>
                  set("matchType", event.target.value as SourceMatchType)
                }
                className={inputClass}
              >
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Nazwa drużyny u źródła">
                <input
                  value={form.teamNameOnSource}
                  onChange={(event) =>
                    set("teamNameOnSource", event.target.value)
                  }
                  placeholder="Okęcie Warszawa"
                  required
                  className={inputClass}
                />
              </Field>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <Button
              type="submit"
              disabled={!form.url.trim() || !form.teamNameOnSource.trim()}
            >
              {busy ? "Dodawanie…" : "Dodaj źródło"}
            </Button>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Wklej link do strony ligi na 90minut.pl albo do drużyny na
            virium.pl. Nazwa drużyny musi być dokładnie taka, jak na stronie
            źródła.
          </p>
        </fieldset>
      </form>
    </section>
  );
}
