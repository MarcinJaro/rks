"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { AdminEditorDialog } from "@/components/admin/AdminEditorDialog";
import { Field, Feedback, inputClass } from "@/components/admin/fields";
import { FileUpload } from "@/components/admin/FileUpload";
import {
  ArticleComposer,
  type ComposerValue,
} from "@/components/admin/ArticleComposer";
import { errorMessage } from "@/lib/convexError";

type FormState = {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  teamId: string;
  content: string;
  contentHtml: string;
  contentJson?: string;
  inlineImageIds: Id<"_storage">[];
  galleryIds: Id<"_storage">[];
  mediaUrls: Record<string, string | null>;
  status: "draft" | "published";
  publishedAt: string;
  imageStorageId: Id<"_storage"> | "";
  youtubeUrl: string;
};

const emptyForm: FormState = {
  title: "",
  slug: "",
  excerpt: "",
  category: "",
  teamId: "",
  content: "",
  contentHtml: "",
  inlineImageIds: [],
  galleryIds: [],
  mediaUrls: {},
  status: "draft",
  publishedAt: "",
  imageStorageId: "",
  youtubeUrl: "",
};

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Treść wpisywana ręcznie przez klub - escapujemy HTML, żeby nic nie dało się
// wstrzyknąć, a akapity budujemy z pustych linii (pojedynczy enter = <br/>).
function contentToHtml(content: string) {
  return content
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br/>")}</p>`,
    )
    .join("\n");
}

// Wartość dla input[type=datetime-local] musi być w czasie lokalnym,
// toISOString() dałoby przesunięcie o strefę.
function toDatetimeLocal(timestamp: number) {
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminArticlesPage() {
  const articles = useQuery(api.articles.adminList);
  const teams = useQuery(api.teams.list, {});
  const saveDraft = useMutation(api.articles.saveDraft);
  const removeArticle = useMutation(api.articles.removeArticle);
  const removeUpload = useMutation(api.files.removeUpload);

  const [editingId, setEditingId] = useState<Id<"articles"> | "new" | null>(
    null,
  );
  const [form, setForm] = useState<FormState>(emptyForm);
  // Zdjęcie wgrane w tej sesji formularza, jeszcze niezapisane w dokumencie -
  // tylko takie wolno skasować przy Anuluj/podmianie.
  const [uploadedImageId, setUploadedImageId] = useState<Id<"_storage"> | "">(
    "",
  );
  const sessionUploads = useRef<Id<"_storage">[]>([]);
  const [dirty, setDirty] = useState(false);
  const [initialContent, setInitialContent] = useState(emptyForm);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const editorBusy = busy || uploadBusy;
  const articleMedia = useQuery(
    api.articles.adminMedia,
    editingId && editingId !== "new" ? { id: editingId } : "skip",
  );
  const coverUrl = useQuery(
    api.files.getImageUrl,
    form.imageStorageId ? { storageId: form.imageStorageId } : "skip",
  );

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setDirty(true);
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetFeedback() {
    setError(null);
    setMessage(null);
  }

  function discardSessionUpload() {
    for (const storageId of sessionUploads.current)
      void removeUpload({ storageId }).catch(() => {});
    sessionUploads.current = [];
    const id = uploadedImageId;
    if (!id) return;
    setUploadedImageId("");
    void removeUpload({ storageId: id }).catch((err) =>
      setError(errorMessage(err)),
    );
  }

  function openNew() {
    resetFeedback();
    discardSessionUpload();
    setForm(emptyForm);
    setInitialContent(emptyForm);
    setDirty(false);
    setEditingId("new");
  }

  function openEdit(article: NonNullable<typeof articles>[number]) {
    resetFeedback();
    discardSessionUpload();
    const nextForm: FormState = {
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt ?? "",
      category: article.category ?? "",
      teamId: article.teamId ?? "",
      content: article.content,
      contentHtml: article.contentHtml,
      contentJson: article.contentJson,
      inlineImageIds: article.inlineImageIds ?? [],
      galleryIds: article.galleryIds ?? [],
      mediaUrls: {},
      status: article.status,
      publishedAt: article.publishedAt
        ? toDatetimeLocal(article.publishedAt)
        : "",
      imageStorageId: article.imageStorageId ?? "",
      youtubeUrl: article.youtubeUrl ?? "",
    };
    setForm(nextForm);
    setInitialContent(nextForm);
    setDirty(false);
    setEditingId(article._id);
  }

  function handleCancel() {
    if (dirty && !window.confirm("Odrzucić niezapisane zmiany w artykule?"))
      return;
    setDirty(false);
    resetFeedback();
    discardSessionUpload();
    setForm(emptyForm);
    setEditingId(null);
  }

  function handleImageUploaded(ids: Id<"_storage">[]) {
    const next = ids[0];
    if (!next) return;
    // Podmiana przed zapisem: sprzątamy poprzedni świeży upload.
    if (uploadedImageId && uploadedImageId !== next) {
      void removeUpload({ storageId: uploadedImageId }).catch((err) =>
        setError(errorMessage(err)),
      );
    }
    setUploadedImageId(next);
    set("imageStorageId", next);
  }

  async function handleSave() {
    if (editorBusy) return;
    resetFeedback();
    setBusy(true);
    try {
      const content = form.content;
      await saveDraft({
        id: editingId && editingId !== "new" ? editingId : undefined,
        title: form.title,
        // Existing articles are identified by id; empty slugs are generated.
        slug: form.slug.trim(),
        content,
        contentHtml: form.contentHtml || contentToHtml(content),
        contentJson: form.contentJson,
        inlineImageIds: form.inlineImageIds,
        galleryIds: form.galleryIds,
        excerpt: form.excerpt.trim() || undefined,
        category: form.category.trim() || undefined,
        teamId: form.teamId ? (form.teamId as Id<"teams">) : undefined,
        publishedAt: form.publishedAt
          ? new Date(form.publishedAt).getTime()
          : undefined,
        status: form.status,
        imageStorageId: form.imageStorageId || undefined,
        youtubeUrl: form.youtubeUrl.trim() || undefined,
      });
      const retained = new Set([...form.inlineImageIds, ...form.galleryIds]);
      for (const storageId of sessionUploads.current)
        if (!retained.has(storageId))
          void removeUpload({ storageId }).catch(() => {});
      sessionUploads.current = [];
      setDirty(false);
      // Zdjęcie jest już zapisane w dokumencie - nie wolno go sprzątać.
      setUploadedImageId("");
      setForm(emptyForm);
      setEditingId(null);
      setMessage("Artykuł zapisany");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(id: Id<"articles">, title: string) {
    resetFeedback();
    if (
      !window.confirm(
        `Usunąć artykuł „${title}" wraz ze zdjęciami? Tej operacji nie można cofnąć.`,
      )
    ) {
      return;
    }
    try {
      await removeArticle({ id });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (articles === undefined || teams === undefined) {
    return <p className="text-sm text-muted-foreground">Wczytywanie…</p>;
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-navy">Artykuły</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Klubowe aktualności widoczne na stronie. Szkice nie pojawiają się
            publicznie, dopóki nie zmienisz statusu na „Opublikowany&quot;.
          </p>
        </div>
        <Button onClick={openNew}>Dodaj artykuł</Button>
      </div>
      <Feedback error={editingId ? null : error} message={message} />

      <AdminEditorDialog
        open={editingId !== null}
        onClose={handleCancel}
        title={editingId === "new" ? "Nowy artykuł" : "Edycja artykułu"}
        description="Klubowa redakcja · tekst, zdjęcia i galeria w jednym miejscu."
        size="xl"
        busy={editorBusy}
        footer={
          <>
            <span className="mr-auto text-xs text-muted-foreground">
              {dirty ? "Niezapisane zmiany" : "Gotowy do edycji"}
            </span>
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
              form="article-editor-form"
              disabled={editorBusy || !form.title.trim()}
            >
              {busy ? "Zapisywanie…" : uploadBusy ? "Wysyłanie…" : "Zapisz"}
            </Button>
          </>
        }
      >
        <form
          id="article-editor-form"
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
            <div className="md:col-span-2">
              <Field label="Tytuł">
                <input
                  value={form.title}
                  onChange={(event) => set("title", event.target.value)}
                  required
                  className={`${inputClass} text-xl font-bold`}
                  placeholder="Nadaj tytuł swojej historii…"
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Zajawka">
                <textarea
                  value={form.excerpt}
                  onChange={(event) => set("excerpt", event.target.value)}
                  rows={2}
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              {editingId !== "new" && articleMedia === undefined ? (
                <p
                  role="status"
                  className="py-12 text-center text-muted-foreground"
                >
                  Wczytywanie treści i zdjęć…
                </p>
              ) : (
                <ArticleComposer
                  key={editingId}
                  disabled={busy}
                  initialHtml={
                    initialContent.contentHtml ||
                    contentToHtml(initialContent.content)
                  }
                  initialJson={initialContent.contentJson}
                  initialGallery={initialContent.galleryIds}
                  initialUrls={articleMedia ?? initialContent.mediaUrls}
                  onChange={(value: ComposerValue) => {
                    setDirty(true);
                    setForm((prev) => ({ ...prev, ...value }));
                  }}
                  onUploaded={(id) => {
                    sessionUploads.current.push(id);
                    setDirty(true);
                  }}
                  onBusyChange={setUploadBusy}
                />
              )}
            </div>
            <details
              className="md:col-span-2 rounded-xl border border-border p-5"
              open
            >
              <summary className="cursor-pointer text-base font-black text-navy">
                Publikacja i zdjęcie główne
              </summary>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="Slug (adres URL)">
                  {editingId === "new" ? (
                    <input
                      value={form.slug}
                      onChange={(event) => set("slug", event.target.value)}
                      placeholder="puste = wygeneruje się z tytułu"
                      className={inputClass}
                    />
                  ) : (
                    <>
                      <input
                        value={form.slug}
                        readOnly
                        className={`${inputClass} opacity-60`}
                      />
                      <span className="text-xs font-normal text-muted-foreground">
                        Slug jest stały - zmiana zerwałaby istniejące linki.
                      </span>
                    </>
                  )}
                </Field>
                <Field label="Kategoria">
                  <input
                    value={form.category}
                    onChange={(event) => set("category", event.target.value)}
                    placeholder="Mecze, obozy, klub…"
                    className={inputClass}
                  />
                </Field>
                <Field label="Drużyna">
                  <select
                    value={form.teamId}
                    onChange={(event) => set("teamId", event.target.value)}
                    className={inputClass}
                  >
                    <option value="">Brak przypisania</option>
                    {teams.map((team) => (
                      <option key={team._id} value={team._id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Status">
                  <select
                    value={form.status}
                    onChange={(event) =>
                      set("status", event.target.value as FormState["status"])
                    }
                    className={inputClass}
                  >
                    <option value="draft">Szkic</option>
                    <option value="published">Opublikowany</option>
                  </select>
                </Field>
                <Field label="Data publikacji">
                  <input
                    type="datetime-local"
                    value={form.publishedAt}
                    onChange={(event) => set("publishedAt", event.target.value)}
                    className={inputClass}
                  />
                  <span className="text-xs font-normal text-muted-foreground">
                    Puste pole przy publikacji = data ustawi się automatycznie.
                  </span>
                </Field>
                <Field label="Link YouTube">
                  <input
                    value={form.youtubeUrl}
                    onChange={(event) => set("youtubeUrl", event.target.value)}
                    placeholder="https://www.youtube.com/watch?v=…"
                    className={inputClass}
                  />
                </Field>
                <div className="md:col-span-2">
                  <FileUpload
                    label="Zdjęcie główne · automatyczna optymalizacja"
                    optimizeImages
                    maxSizeMb={30}
                    accept="image/jpeg,image/png,image/webp"
                    onBusyChange={setUploadBusy}
                    onUploaded={handleImageUploaded}
                  />
                  {coverUrl ? (
                    <Image
                      src={coverUrl}
                      alt="Zdjęcie główne"
                      width={240}
                      height={160}
                      className="mt-3 h-32 w-auto rounded-lg object-contain"
                    />
                  ) : null}
                  {uploadedImageId ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Zdjęcie wysłane. Zapisze się po kliknięciu
                      &quot;Zapisz&quot;.
                    </p>
                  ) : null}
                </div>
              </div>
            </details>
          </fieldset>
        </form>
      </AdminEditorDialog>

      <div className="mt-6 grid gap-3">
        {articles.map((article) => (
          <article
            key={article._id}
            className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4"
          >
            <div className="flex min-w-0 items-center gap-3">
              {article.imageUrl ? (
                <Image
                  src={article.imageUrl}
                  alt=""
                  width={96}
                  height={64}
                  className="h-16 w-24 shrink-0 rounded-md object-cover"
                />
              ) : (
                <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
                  brak
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-black text-navy">{article.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className={
                      article.status === "published"
                        ? "rounded bg-primary/15 px-2 py-0.5 font-bold text-primary"
                        : "rounded bg-muted px-2 py-0.5 font-bold"
                    }
                  >
                    {article.status === "published" ? "Opublikowany" : "Szkic"}
                  </span>
                  {article.publishedAt ? (
                    <span>
                      {new Intl.DateTimeFormat("pl-PL", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(article.publishedAt))}
                    </span>
                  ) : null}
                  {article.category ? <span>· {article.category}</span> : null}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => openEdit(article)}
              >
                Edytuj
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemove(article._id, article.title)}
              >
                Usuń
              </Button>
            </div>
          </article>
        ))}
        {articles.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak artykułów.</p>
        ) : null}
      </div>
    </>
  );
}
