"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { AdminEditorDialog } from "@/components/admin/AdminEditorDialog";
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
  const [editingId, setEditingId] = useState<
    Id<"documents"> | "new" | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const editorBusy = busy || uploadBusy;
  const removeUpload = useMutation(api.files.removeUpload);

  function resetForm() {
    setTitle("");
    setCategory("");
    setFileStorageId("");
  }

  function handleCloseEditor() {
    const pendingFileId = fileStorageId;
    setEditingId(null);
    resetForm();
    setError(null);
    setMessage(null);
    if (pendingFileId) {
      void removeUpload({ storageId: pendingFileId }).catch((err) => {
        setError(errorMessage(err));
      });
    }
  }

  function openNew() {
    resetForm();
    setError(null);
    setMessage(null);
    setEditingId("new");
  }

  async function handleSave() {
    if (editorBusy) return;
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      if (editingId && editingId !== "new") {
        await updateDocument({
          id: editingId,
          title,
          category,
          // Nowy plik podmienia stary (backend kasuje poprzedni ze storage).
          ...(fileStorageId ? { fileStorageId } : {}),
        });
        setMessage("Dokument zapisany");
      } else {
        if (!fileStorageId) {
          throw new Error("Dodaj plik PDF");
        }
        await createDocument({ title, category, fileStorageId });
        setMessage("Dokument dodany");
      }
      setEditingId(null);
      resetForm();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black text-navy">Dokumenty</h1>
        <Button onClick={openNew}>Dodaj dokument</Button>
      </div>
      {!editingId ? <Feedback error={error} message={message} /> : null}

      <AdminEditorDialog
        open={editingId !== null}
        onClose={handleCloseEditor}
        title={editingId === "new" ? "Nowy dokument" : "Edycja dokumentu"}
        description={
          editingId === "new"
            ? "Dodaj nazwę, kategorię i plik PDF dostępny na stronie klubu."
            : "Zmień dane dokumentu lub opcjonalnie zastąp jego plik PDF."
        }
        busy={editorBusy}
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={handleCloseEditor}
              disabled={editorBusy}
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              form="document-editor-form"
              disabled={
                editorBusy ||
                !title ||
                !category ||
                (editingId === "new" && !fileStorageId)
              }
            >
              {busy ? "Zapisywanie…" : uploadBusy ? "Wysyłanie…" : "Zapisz"}
            </Button>
          </>
        }
      >
        <form
          id="document-editor-form"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <Feedback error={error} />
          <fieldset
            disabled={editorBusy}
            className={
              error
                ? "mt-4 grid min-w-0 gap-4 border-0 p-0 md:grid-cols-2"
                : "grid min-w-0 gap-4 border-0 p-0 md:grid-cols-2"
            }
          >
            <Field label="Tytuł">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Kategoria">
              <input
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Statut, deklaracje, RODO…"
                required
                className={inputClass}
              />
            </Field>
            <div className="md:col-span-2">
              <FileUpload
                label={
                  editingId === "new"
                    ? "Plik PDF (max 20 MB)"
                    : "Nowy plik PDF (opcjonalnie - podmieni obecny)"
                }
                accept="application/pdf"
                maxSizeMb={20}
                onBusyChange={setUploadBusy}
                onUploaded={(ids) => {
                  const nextFileId = ids[0];
                  if (!nextFileId) return;
                  if (fileStorageId && fileStorageId !== nextFileId) {
                    void removeUpload({ storageId: fileStorageId }).catch(
                      (err) => setError(errorMessage(err)),
                    );
                  }
                  setFileStorageId(nextFileId);
                }}
              />
              {fileStorageId ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Plik wysłany. Zapisze się po kliknięciu &quot;Zapisz&quot;.
                </p>
              ) : null}
            </div>
          </fieldset>
        </form>
      </AdminEditorDialog>

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
