"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { AdminEditorDialog } from "@/components/admin/AdminEditorDialog";
import { Button } from "@/components/ui/button";
import { Field, Feedback, inputClass } from "@/components/admin/fields";
import { FileUpload } from "@/components/admin/FileUpload";
import { TeamSources } from "./TeamSources";
import { errorMessage } from "@/lib/convexError";

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

  const removeUpload = useMutation(api.files.removeUpload);

  const [editingId, setEditingId] = useState<Id<"teams"> | "new" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [sourcesBusy, setSourcesBusy] = useState(false);
  const editorBusy = busy || uploadBusy || sourcesBusy;
  const [editorSession, setEditorSession] = useState(0);
  const activeEditorSessionRef = useRef(0);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Sprząta wyłącznie plik wgrany w tej sesji formularza, jeszcze niezapisany.
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
    if (form.groupPhotoId && form.groupPhotoId !== nextPhotoId) {
      removePendingUpload(form.groupPhotoId);
    }
    set("groupPhotoId", nextPhotoId);
    setPhotoRemoved(false);
  }

  function handleCancel() {
    const pendingPhotoId = form.groupPhotoId;
    activeEditorSessionRef.current += 1;
    setEditingId(null);
    setForm(emptyForm);
    setExistingPhotoUrl(null);
    setPhotoRemoved(false);
    setError(null);
    if (pendingPhotoId) removePendingUpload(pendingPhotoId);
  }

  async function handleReorder(id: Id<"teams">, direction: "up" | "down") {
    setError(null);
    try {
      await reorder({ id, direction });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleSave() {
    if (editorBusy) return;
    setError(null);
    setBusy(true);
    activeEditorSessionRef.current += 1;
    try {
      if (editingId === "new") {
        await createTeam({
          name: form.name,
          yearGroup: form.yearGroup ? Number(form.yearGroup) : undefined,
          league: form.league || undefined,
          schedule: form.schedule || undefined,
          description: form.description || undefined,
          isActive: form.isActive,
          groupPhotoId: form.groupPhotoId || undefined,
          coachId: form.coachId ? (form.coachId as Id<"people">) : undefined,
        });
      } else if (editingId) {
        await updateTeam({
          id: editingId,
          name: form.name,
          yearGroup: form.yearGroup ? Number(form.yearGroup) : null,
          league: form.league || null,
          schedule: form.schedule || null,
          description: form.description || null,
          isActive: form.isActive,
          coachId: form.coachId ? (form.coachId as Id<"people">) : null,
          ...(form.groupPhotoId
            ? { groupPhotoId: form.groupPhotoId }
            : photoRemoved
              ? { groupPhotoId: null }
              : {}),
        });
      }
      setEditingId(null);
      setForm(emptyForm);
      setExistingPhotoUrl(null);
      setPhotoRemoved(false);
    } catch (err) {
      beginEditorSession();
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: Id<"teams">) {
    if (
      !window.confirm(
        "Usunąć drużynę? Razem z nią zostaną usunięte: kadra zawodników ze zdjęciami, źródła synchronizacji, tabele ligowe i mecze wpisane ręcznie. Tej operacji nie można cofnąć.",
      )
    ) {
      return;
    }
    setError(null);
    try {
      await removeTeam({ id });
      if (editingId === id) setEditingId(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black text-navy">Drużyny</h1>
        <Button
          onClick={() => {
            setForm(emptyForm);
            beginEditorSession();
            setEditingId("new");
            setError(null);
          }}
        >
          Dodaj drużynę
        </Button>
      </div>

      <Feedback error={editingId ? null : error} />

      <AdminEditorDialog
        open={editingId !== null}
        onClose={handleCancel}
        title={editingId === "new" ? "Nowa drużyna" : "Edycja drużyny"}
        description={
          editingId === "new"
            ? "Dodaj drużynę i uporządkuj jej dane organizacyjne."
            : "Zmień dane drużyny i zarządzaj jej źródłami synchronizacji."
        }
        size="xl"
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
              form="team-editor-form"
              disabled={editorBusy || !form.name}
            >
              {busy ? "Zapisywanie…" : uploadBusy ? "Wysyłanie…" : "Zapisz"}
            </Button>
          </>
        }
      >
        <form
          id="team-editor-form"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <Feedback error={error} />
          <fieldset
            disabled={editorBusy}
            className="mt-4 grid min-w-0 gap-4 border-0 p-0 md:grid-cols-2"
          >
            <Field label="Nazwa">
              <input
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
                required
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
                <option value="">Brak przypisania</option>
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
              Drużyna aktywna
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
              {existingPhotoUrl && !photoRemoved && !form.groupPhotoId ? (
                <div className="mb-3 flex items-center gap-3">
                  <Image
                    src={existingPhotoUrl}
                    alt="Aktualne zdjęcie grupowe"
                    width={96}
                    height={64}
                    className="h-16 w-24 rounded object-cover"
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
                label="Zdjęcie grupowe (obraz, max 10 MB)"
                accept="image/*"
                onBusyChange={setUploadBusy}
                onUploaded={(ids) => handlePhotoUploaded(ids, editorSession)}
              />
              {form.groupPhotoId ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Nowe zdjęcie zostanie zapisane po kliknięciu
                  &quot;Zapisz&quot;.
                </p>
              ) : null}
            </div>
          </fieldset>
        </form>
        {editingId && editingId !== "new" ? (
          <TeamSources
            teamId={editingId}
            embedded
            onBusyChange={setSourcesBusy}
          />
        ) : null}
      </AdminEditorDialog>

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
                onClick={() => handleReorder(team._id, "up")}
                className="text-muted-foreground disabled:opacity-30"
              >
                ▲
              </button>
              <button
                type="button"
                aria-label="Przesuń niżej"
                disabled={index === (teams?.length ?? 0) - 1}
                onClick={() => handleReorder(team._id, "down")}
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
                  team.coaches.length
                    ? `trenerzy: ${team.coaches.map((coach) => coach.name).join(", ")}`
                    : null,
                  `${team.playerCount} ${
                    team.playerCount === 1 ? "zawodnik" : "zawodników"
                  }`,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Brak dodatkowych informacji"}
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
                  setExistingPhotoUrl(team.groupPhotoUrl ?? null);
                  setPhotoRemoved(false);
                  beginEditorSession();
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
            Brak drużyn. Dodaj pierwszą.
          </p>
        ) : null}
      </div>
    </>
  );
}
