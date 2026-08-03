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
                  Plik wysłany — zapisze się po kliknięciu &quot;Zapisz&quot;.
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
