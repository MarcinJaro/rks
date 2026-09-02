"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Field, Feedback, inputClass } from "@/components/admin/fields";
import { FileUpload } from "@/components/admin/FileUpload";
import { errorMessage } from "@/lib/convexError";

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
  const [busy, setBusy] = useState(false);
  const removeUpload = useMutation(api.files.removeUpload);

  // Plik wgrany w tej sesji i porzucony przed zapisem musi zniknąć ze storage.
  function discardPendingUpload() {
    if (fileStorageId) {
      void removeUpload({ storageId: fileStorageId }).catch(() => {});
    }
  }

  async function handleSave() {
    if (busy) return;
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      if (editingId) {
        await updateDocument({
          id: editingId,
          title,
          category,
          // Nowy plik podmienia stary (backend kasuje poprzedni ze storage).
          ...(fileStorageId ? { fileStorageId } : {}),
        });
        setEditingId(null);
        setMessage("Dokument zapisany");
      } else {
        if (!fileStorageId) {
          throw new Error("Dodaj plik PDF");
        }
        await createDocument({ title, category, fileStorageId });
        setMessage("Dokument dodany");
      }
      setTitle("");
      setCategory("");
      setFileStorageId("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
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
          <div className="md:col-span-2">
            <FileUpload
              label={
                editingId
                  ? "Nowy plik PDF (opcjonalnie - podmieni obecny)"
                  : "Plik PDF (max 20 MB)"
              }
              accept="application/pdf"
              maxSizeMb={20}
              onUploaded={(ids) => {
                if (fileStorageId && fileStorageId !== ids[0]) {
                  void removeUpload({ storageId: fileStorageId }).catch(() => {});
                }
                setFileStorageId(ids[0]);
              }}
            />
            {fileStorageId ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Plik wysłany. Zapisze się po kliknięciu &quot;Zapisz&quot;.
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <Button onClick={handleSave} disabled={busy || !title || !category}>
            {busy ? "Zapisywanie…" : "Zapisz"}
          </Button>
          {editingId ? (
            <Button
              variant="ghost"
              onClick={() => {
                discardPendingUpload();
                setEditingId(null);
                setTitle("");
                setCategory("");
                setFileStorageId("");
                setError(null);
                setMessage(null);
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
                  setFileStorageId("");
                  setError(null);
                  setMessage(null);
                }}
              >
                Edytuj
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  if (window.confirm("Usunąć dokument wraz z plikiem?")) {
                    setError(null);
                    setMessage(null);
                    try {
                      await removeDocument({ id: document._id });
                    } catch (err) {
                      setError(errorMessage(err));
                    }
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
