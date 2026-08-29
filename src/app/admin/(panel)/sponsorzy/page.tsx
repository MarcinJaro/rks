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
  const removeUpload = useMutation(api.files.removeUpload);

  const [editingId, setEditingId] = useState<Id<"sponsors"> | "new" | null>(
    null,
  );
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Kasujemy tylko logo wgrane w tej sesji formularza i porzucone przed
  // zapisem - plik zapisany już w dokumencie zostaje nietknięty.
  async function discardUpload(storageId: Id<"_storage">) {
    try {
      await removeUpload({ storageId });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleReorder(id: Id<"sponsors">, direction: "up" | "down") {
    setError(null);
    try {
      await reorder({ id, direction });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleRemove(id: Id<"sponsors">) {
    if (!window.confirm("Usunąć tego sponsora?")) return;
    setError(null);
    try {
      await removeSponsor({ id });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleSave() {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      if (editingId === "new") {
        if (!form.logoStorageId) {
          throw new Error("Dodaj logo — jest wymagane");
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
          url: form.url || null,
          type: form.type,
          logoStorageId: form.logoStorageId || undefined,
        });
      }
      setEditingId(null);
      setForm(emptyForm);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
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
                onUploaded={(ids) => {
                  if (form.logoStorageId && form.logoStorageId !== ids[0]) {
                    void discardUpload(form.logoStorageId);
                  }
                  set("logoStorageId", ids[0]);
                }}
              />
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <Button onClick={handleSave} disabled={busy || !form.name}>
              {busy ? "Zapisywanie…" : "Zapisz"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                if (form.logoStorageId) void discardUpload(form.logoStorageId);
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
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
                      onClick={() => handleReorder(sponsor._id, "up")}
                      className="text-muted-foreground disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      aria-label="Przesuń niżej"
                      disabled={index === items.length - 1}
                      onClick={() => handleReorder(sponsor._id, "down")}
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
                      onClick={() => handleRemove(sponsor._id)}
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
