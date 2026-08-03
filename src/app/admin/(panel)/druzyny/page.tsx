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
                  Nowe zdjęcie zostanie zapisane po kliknięciu &quot;Zapisz&quot;.
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
