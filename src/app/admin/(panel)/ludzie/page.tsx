"use client";

import Image from "next/image";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Field, Feedback, inputClass } from "@/components/admin/fields";
import { FileUpload } from "@/components/admin/FileUpload";
import { errorMessage } from "@/lib/convexError";

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
  const removeUpload = useMutation(api.files.removeUpload);

  const [editingId, setEditingId] = useState<Id<"people"> | "new" | null>(
    null,
  );
  const [form, setForm] = useState<FormState>(emptyForm);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Sprząta wyłącznie plik wgrany w tej sesji formularza i jeszcze niezapisany
  // w dokumencie - zapisane zdjęcia kasuje backend przy update/remove.
  function discardPendingUpload() {
    if (form.photoStorageId) {
      void removeUpload({ storageId: form.photoStorageId }).catch(() => {});
    }
  }

  function handlePhotoUploaded(ids: Id<"_storage">[]) {
    if (form.photoStorageId && form.photoStorageId !== ids[0]) {
      void removeUpload({ storageId: form.photoStorageId }).catch(() => {});
    }
    set("photoStorageId", ids[0]);
    setPhotoRemoved(false);
  }

  function handleRemovePhoto() {
    if (form.photoStorageId) {
      void removeUpload({ storageId: form.photoStorageId }).catch(() => {});
      set("photoStorageId", "");
    }
    if (existingPhotoUrl) setPhotoRemoved(true);
  }

  function handleCancel() {
    discardPendingUpload();
    setEditingId(null);
    setForm(emptyForm);
    setExistingPhotoUrl(null);
    setPhotoRemoved(false);
  }

  async function handleSave() {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      if (editingId === "new") {
        await createPerson({
          name: form.name,
          role: form.role,
          position: form.position || undefined,
          teamId: form.teamId ? (form.teamId as Id<"teams">) : undefined,
          qualifications: form.qualifications || undefined,
          bio: form.bio || undefined,
          photoStorageId: form.photoStorageId || undefined,
        });
      } else if (editingId) {
        await updatePerson({
          id: editingId,
          name: form.name,
          role: form.role,
          position: form.position || null,
          teamId: form.teamId ? (form.teamId as Id<"teams">) : null,
          qualifications: form.qualifications || null,
          bio: form.bio || null,
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
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(id: Id<"people">) {
    setError(null);
    if (!window.confirm("Usunąć tę osobę?")) return;
    try {
      await removePerson({ id });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleReorder(id: Id<"people">, direction: "up" | "down") {
    setError(null);
    try {
      await reorder({ id, direction });
    } catch (err) {
      setError(errorMessage(err));
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
            setExistingPhotoUrl(null);
            setPhotoRemoved(false);
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
              {existingPhotoUrl && !photoRemoved && !form.photoStorageId ? (
                <div className="mb-3 flex items-center gap-3">
                  <Image
                    src={existingPhotoUrl}
                    alt="Aktualne zdjęcie"
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <Button size="sm" variant="ghost" onClick={handleRemovePhoto}>
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
                onUploaded={handlePhotoUploaded}
              />
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <Button onClick={handleSave} disabled={busy || !form.name}>
              {busy ? "Zapisywanie…" : "Zapisz"}
            </Button>
            <Button variant="ghost" onClick={handleCancel}>
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
                    onClick={() => handleReorder(person._id, "up")}
                    className="text-muted-foreground disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label="Przesuń niżej"
                    disabled={index === items.length - 1}
                    onClick={() => handleReorder(person._id, "down")}
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
                      setExistingPhotoUrl(person.photoUrl ?? null);
                      setPhotoRemoved(false);
                      setError(null);
                    }}
                  >
                    Edytuj
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemove(person._id)}
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
