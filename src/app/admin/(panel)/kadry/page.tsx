"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { AdminEditorDialog } from "@/components/admin/AdminEditorDialog";
import { Button } from "@/components/ui/button";
import { Field, Feedback, inputClass } from "@/components/admin/fields";
import { FileUpload } from "@/components/admin/FileUpload";
import { parseRosterList } from "@/lib/rosterList";
import { errorMessage } from "@/lib/convexError";

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

export default function AdminSquadsPage() {
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
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [bulkTeamId, setBulkTeamId] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const editorBusy = busy || uploadBusy;
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [editorSession, setEditorSession] = useState(0);
  const activeEditorSessionRef = useRef(0);

  const grouped = useMemo(() => {
    if (!teams) return [];
    return teams.map((team) => ({
      team,
      items: (players ?? []).filter((player) => player.teamId === team._id),
    }));
  }, [teams, players]);

  const bulkPreview = useMemo(() => parseRosterList(bulkText), [bulkText]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // form.photoStorageId trzyma WYŁĄCZNIE plik wgrany w tej sesji formularza -
  // zapisane zdjęcie reprezentuje existingPhotoUrl. Dzięki temu sprzątanie
  // nigdy nie skasuje pliku należącego do dokumentu.
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
    if (form.photoStorageId && form.photoStorageId !== ids[0]) {
      removePendingUpload(form.photoStorageId);
    }
    set("photoStorageId", nextPhotoId);
    setPhotoRemoved(false);
  }

  function handleCancel() {
    const pendingPhotoId = form.photoStorageId;
    activeEditorSessionRef.current += 1;
    setEditingId(null);
    setForm(emptyForm);
    setExistingPhotoUrl(null);
    setPhotoRemoved(false);
    setError(null);
    if (pendingPhotoId) removePendingUpload(pendingPhotoId);
  }

  async function handleReorder(id: Id<"players">, direction: "up" | "down") {
    resetFeedback();
    try {
      await reorder({ id, direction });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function resetFeedback() {
    setError(null);
    setMessage(null);
  }

  async function handleSave() {
    if (editorBusy) return;
    resetFeedback();
    setBusy(true);
    activeEditorSessionRef.current += 1;
    try {
      if (editingId === "new") {
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
    } catch (err) {
      beginEditorSession();
      setError(err instanceof Error ? err.message : "Coś poszło nie tak");
    } finally {
      setBusy(false);
    }
  }

  async function handleBulkImport() {
    if (busy) return;
    resetFeedback();
    setBusy(true);
    try {
      if (!bulkTeamId) throw new Error("Wybierz drużynę do importu");
      const count = await createMany({
        teamId: bulkTeamId as Id<"teams">,
        entries: bulkPreview,
      });
      setMessage(`Dodano ${count} zawodników`);
      setBulkText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import się nie udał");
    } finally {
      setBusy(false);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się usunąć");
    }
  }

  if (players === undefined || teams === undefined) {
    return <p className="text-sm text-muted-foreground">Wczytywanie…</p>;
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-navy">Kadry</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Zawodnicy widoczni na stronach drużyn. Dopóki drużyna nie ma tu
            żadnego wpisu, jej strona pokazuje komunikat o kadrze w
            przygotowaniu.
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(emptyForm);
            beginEditorSession();
            setEditingId("new");
            resetFeedback();
          }}
        >
          Dodaj zawodnika
        </Button>
      </div>

      <Feedback error={editingId ? null : error} message={message} />

      <AdminEditorDialog
        open={editingId !== null}
        onClose={handleCancel}
        title={editingId === "new" ? "Nowy zawodnik" : "Edycja zawodnika"}
        description={
          editingId === "new"
            ? "Dodaj zawodnika do wybranej drużyny."
            : "Zmień dane zawodnika bez opuszczania listy kadry."
        }
        size="lg"
        busy={editorBusy}
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              disabled={editorBusy}
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              form="player-editor-form"
              disabled={editorBusy || !form.name}
            >
              {busy ? "Zapisywanie…" : uploadBusy ? "Wysyłanie…" : "Zapisz"}
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
                {teams.map((team) => (
                  <option key={team._id} value={team._id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="md:col-span-3">
              {existingPhotoUrl && !photoRemoved && !form.photoStorageId ? (
                <div className="mb-3 flex items-center gap-3">
                  <Image
                    src={existingPhotoUrl}
                    alt="Aktualne zdjęcie"
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

      <section className="mt-8 rounded-lg border border-border bg-card p-5">
        <h2 className="text-lg font-black text-navy">Import listy</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Wklej kadrę - jeden zawodnik w linii. Numer na początku linii jest
          opcjonalny, np. <code>10 Jan Kowalski</code>. Zdjęcia dodasz później
          przy poszczególnych zawodnikach.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-[240px_1fr]">
          <Field label="Drużyna">
            <select
              value={bulkTeamId}
              onChange={(event) => setBulkTeamId(event.target.value)}
              className={inputClass}
            >
              <option value="">Wybierz drużynę</option>
              {teams.map((team) => (
                <option key={team._id} value={team._id}>
                  {team.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Lista zawodników">
            <textarea
              value={bulkText}
              onChange={(event) => setBulkText(event.target.value)}
              rows={6}
              placeholder={
                "1 Bartosz Golder\n10 Patryk Tarkowski\nKarol Nguyen"
              }
              className={inputClass}
            />
          </Field>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button
            onClick={handleBulkImport}
            disabled={busy || !bulkTeamId || bulkPreview.length === 0}
          >
            {busy
              ? "Dodawanie…"
              : `Dodaj ${bulkPreview.length || ""} zawodników`}
          </Button>
          {bulkPreview.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Rozpoznano {bulkPreview.length} linii
              {bulkPreview.filter((entry) => entry.number).length > 0
                ? `, w tym ${bulkPreview.filter((entry) => entry.number).length} z numerem`
                : ""}
              .
            </p>
          ) : null}
        </div>
      </section>

      {grouped.map(({ team, items }) => (
        <section key={team._id} className="mt-8">
          <h2 className="text-lg font-black text-navy">
            {team.name}{" "}
            <span className="text-sm font-bold text-muted-foreground">
              ({items.length})
            </span>
          </h2>
          {items.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              Brak zawodników w panelu.
            </p>
          ) : (
            <div className="mt-3 grid gap-3">
              {items.map((player, index) => (
                <article
                  key={player._id}
                  className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      aria-label="Przesuń wyżej"
                      disabled={index === 0}
                      onClick={() => handleReorder(player._id, "up")}
                      className="text-muted-foreground disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      aria-label="Przesuń niżej"
                      disabled={index === items.length - 1}
                      onClick={() => handleReorder(player._id, "down")}
                      className="text-muted-foreground disabled:opacity-30"
                    >
                      ▼
                    </button>
                  </div>
                  {player.photoUrl ? (
                    <Image
                      src={player.photoUrl}
                      alt={player.name}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-xs font-black text-muted-foreground">
                      {player.number || "Brak"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-navy">{player.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {player.number ? `Numer ${player.number}` : "Bez numeru"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
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
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemove(player._id, player.name)}
                    >
                      Usuń
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ))}
    </>
  );
}
