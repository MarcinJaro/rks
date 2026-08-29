"use client";

import Image from "next/image";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Field, Feedback, inputClass } from "@/components/admin/fields";
import { FileUpload } from "@/components/admin/FileUpload";
import { errorMessage } from "@/lib/convexError";

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
  const removeUpload = useMutation(api.files.removeUpload);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // form.imageIds to wyłącznie zdjęcia wgrane w tej sesji formularza,
  // jeszcze niezapisane w galerii - tylko takie wolno sprzątnąć przy Anuluj.
  function handleCancel() {
    for (const imageId of form.imageIds) {
      void removeUpload({ storageId: imageId }).catch(() => {});
    }
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleRemoveGallery(id: Id<"galleries">) {
    if (
      !window.confirm(
        "Usunąć całą galerię wraz ze zdjęciami? Tej operacji nie można cofnąć.",
      )
    ) {
      return;
    }
    setError(null);
    try {
      await removeGallery({ id });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleRemoveImage(id: Id<"galleries">, imageId: Id<"_storage">) {
    if (!window.confirm("Usunąć to zdjęcie?")) return;
    setError(null);
    try {
      await removeImage({ id, imageId });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  // Prefill pola daty w strefie lokalnej - toISOString() (UTC) cofa datę
  // o dzień dla timestampów zapisanych przed 2:00 w nocy czasu polskiego.
  function toDateInputValue(timestamp: number) {
    const date = new Date(timestamp);
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  async function handleSave() {
    if (busy) return;
    setError(null);
    const timestamp = form.date ? new Date(form.date).getTime() : Date.now();
    setBusy(true);
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
          description: form.description || null,
          teamId: form.teamId ? (form.teamId as Id<"teams">) : null,
        });
        if (form.imageIds.length) {
          await addImages({ id: editingId, imageIds: form.imageIds });
        }
      }
      setEditingId(null);
      setForm(emptyForm);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
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
                  kliknięciu &quot;Zapisz&quot;.
                </p>
              ) : null}
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <Button
              onClick={handleSave}
              disabled={
                busy ||
                !form.title ||
                (editingId === "new" && !form.imageIds.length)
              }
            >
              {busy ? "Zapisywanie…" : "Zapisz"}
            </Button>
            <Button variant="ghost" onClick={handleCancel}>
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
                      date: toDateInputValue(gallery.date),
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
                  onClick={() => handleRemoveGallery(gallery._id)}
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
                      onClick={() => handleRemoveImage(gallery._id, imageId)}
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
