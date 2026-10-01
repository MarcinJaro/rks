"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo2,
  Redo2,
  ImagePlus,
  Link as LinkIcon,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Images,
} from "lucide-react";
import { useConvex, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  articleImageIds,
  hydrateArticleDocument,
  parseArticleDocument,
  type ArticleNode,
} from "@/lib/articleDocument";
import { prepareArticleImage } from "@/lib/prepareArticleImage";
import { ArticleBody } from "@/components/articles/ArticleBody";
import { ArticleGallery } from "@/components/articles/ArticleGallery";
import { inputClass } from "./fields";

function prepareLegacyHtml(html: string, urls: Record<string, string | null>) {
  if (typeof window === "undefined") return html;
  const document = new DOMParser().parseFromString(html, "text/html");
  for (const image of document.querySelectorAll("img")) {
    const entry = Object.entries(urls).find(([, url]) => url === image.src);
    if (entry) {
      if (entry[0].startsWith("legacy:"))
        image.setAttribute("data-legacy-index", entry[0].slice(7));
      else image.setAttribute("data-storage-id", entry[0]);
    }
  }
  return document.body.innerHTML;
}

const ArticleImage = ImageExtension.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      legacyIndex: {
        default: null,
        parseHTML: (element) =>
          element.hasAttribute("data-legacy-index")
            ? Number(element.getAttribute("data-legacy-index"))
            : null,
        renderHTML: (attributes) =>
          attributes.legacyIndex !== null
            ? { "data-legacy-index": attributes.legacyIndex }
            : {},
      },
      storageId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-storage-id"),
        renderHTML: (attributes) => ({
          "data-storage-id": attributes.storageId,
        }),
      },
      width: {
        default: 100,
        renderHTML: (attrs) => ({
          style: `width: ${attrs.width}%; height: auto`,
        }),
      },
    };
  },
});
export type ComposerValue = {
  contentJson: string;
  content: string;
  contentHtml: string;
  inlineImageIds: Id<"_storage">[];
  galleryIds: Id<"_storage">[];
};
export function ArticleComposer({
  initialHtml,
  initialJson,
  initialGallery,
  initialUrls,
  onChange,
  onUploaded,
  onBusyChange,
  disabled = false,
}: {
  disabled?: boolean;
  initialHtml: string;
  initialJson?: string;
  initialGallery: Id<"_storage">[];
  initialUrls: Record<string, string | null>;
  onChange: (value: ComposerValue) => void;
  onUploaded: (id: Id<"_storage">) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [gallery, setGallery] = useState(initialGallery);
  const [urls, setUrls] = useState(initialUrls);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const [maxEdge, setMaxEdge] = useState(2000);
  const [quality, setQuality] = useState(0.82);
  const [dragging, setDragging] = useState(false);
  const uploadLock = useRef(false);
  const inlineInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const galleryRef = useRef(gallery);
  const urlsRef = useRef(urls);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const convex = useConvex();
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        code: false,
        codeBlock: false,
        heading: { levels: [2, 3] },
        link: { openOnClick: false },
      }),
      ArticleImage,
    ],
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    content: initialJson
      ? hydrateArticleDocument(parseArticleDocument(initialJson), initialUrls)
      : prepareLegacyHtml(initialHtml, initialUrls),
    editorProps: {
      transformPastedHTML: (html) => html.replace(/<img\b[^>]*>/gi, ""),
      attributes: {
        class: "article-prose min-h-80 px-5 py-6 sm:px-9 outline-none",
        "aria-label": "Treść artykułu",
      },
    },
    onUpdate: ({ editor: current }) => {
      const doc = current.getJSON() as ArticleNode;
      onChangeRef.current({
        contentJson: JSON.stringify(doc),
        content: current.getText(),
        contentHtml: current.getHTML(),
        inlineImageIds: articleImageIds(doc) as Id<"_storage">[],
        galleryIds: galleryRef.current,
      });
    },
  });
  useEffect(() => {
    editor?.setEditable(!busy && !disabled, false);
  }, [editor, busy, disabled]);
  const state = ((e: typeof editor) =>
    e
      ? {
          bold: e.isActive("bold"),
          italic: e.isActive("italic"),
          underline: e.isActive("underline"),
          h2: e.isActive("heading", { level: 2 }),
          h3: e.isActive("heading", { level: 3 }),
          bullet: e.isActive("bulletList"),
          ordered: e.isActive("orderedList"),
          quote: e.isActive("blockquote"),
          image: e.isActive("image"),
          attrs: e.getAttributes("image"),
          json: JSON.stringify(e.getJSON()),
          words: e.getText().trim().split(/\s+/).filter(Boolean).length,
        }
      : null)(editor);
  function notify(nextGallery = galleryRef.current) {
    if (!editor) return;
    onChangeRef.current({
      contentJson: JSON.stringify(editor.getJSON()),
      content: editor.getText(),
      contentHtml: editor.getHTML(),
      inlineImageIds: articleImageIds(
        editor.getJSON() as ArticleNode,
      ) as Id<"_storage">[],
      galleryIds: nextGallery,
    });
  }
  function changeGallery(next: Id<"_storage">[]) {
    galleryRef.current = next;
    setGallery(next);
    notify(next);
  }
  async function upload(files: File[], target: "inline" | "gallery") {
    if (!files.length || uploadLock.current || !editor) return;
    const existing =
      target === "gallery"
        ? galleryRef.current.length
        : articleImageIds(editor.getJSON() as ArticleNode).length;
    if (files.length + existing > 60) {
      setError("W jednej sekcji możesz dodać maksymalnie 60 zdjęć.");
      return;
    }
    uploadLock.current = true;
    setBusy(true);
    onBusyChange(true);
    setError("");
    editor.setEditable(false, false);
    const added: Id<"_storage">[] = [];
    let original = 0,
      compressed = 0;
    const failures: string[] = [];
    // Store the cursor position before a file picker or drop steals focus.
    let position = editor.state.selection.to;
    try {
      for (const [index, file] of files.entries()) {
        setProgress(
          `Przygotowywanie ${index + 1} z ${files.length}: ${file.name}`,
        );
        try {
          const { blob } = await prepareArticleImage(file, maxEdge, quality);
          const url = await generateUploadUrl();
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": blob.type },
            body: blob,
          });
          if (!response.ok) throw new Error("Nie udało się wysłać pliku");
          const { storageId } = (await response.json()) as {
            storageId: Id<"_storage">;
          };
          onUploaded(storageId);
          added.push(storageId);
          original += file.size;
          compressed += blob.size;
          const mediaUrl = await convex.query(api.files.getImageUrl, {
            storageId,
          });
          if (!mediaUrl)
            throw new Error("Nie udało się pobrać podglądu zdjęcia");
          urlsRef.current = { ...urlsRef.current, [storageId]: mediaUrl };
          setUrls(urlsRef.current);
          if (target === "inline") {
            editor
              .chain()
              .insertContentAt(position, [
                {
                  type: "image",
                  attrs: { src: mediaUrl, storageId, alt: "", width: 100 },
                },
                { type: "paragraph" },
              ])
              .run();
            position = editor.state.selection.to;
          }
        } catch (err) {
          failures.push(
            `${file.name}: ${err instanceof Error ? err.message : "Błąd wysyłania"}`,
          );
        }
      }
      if (target === "gallery")
        changeGallery([...galleryRef.current, ...added]);
      setProgress(
        `Dodano ${added.length} z ${files.length} zdjęć${original ? ` · ${(compressed / 1024 / 1024).toFixed(1)} MB zamiast ${(original / 1024 / 1024).toFixed(1)} MB` : ""}.`,
      );
      if (failures.length)
        setError(
          `Nie dodano: ${failures.join("; ")}. Możesz wybrać te pliki ponownie.`,
        );
    } finally {
      uploadLock.current = false;
      setBusy(false);
      onBusyChange(false);
      editor.setEditable(true, false);
    }
  }
  if (!editor || !state)
    return (
      <div
        className="h-80 animate-pulse rounded-xl bg-muted"
        aria-label="Wczytywanie edytora"
      />
    );
  const controls = [
    {
      label: "Pogrubienie",
      icon: Bold,
      active: state.bold,
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "Kursywa",
      icon: Italic,
      active: state.italic,
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "Podkreślenie",
      icon: Underline,
      active: state.underline,
      run: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      label: "Nagłówek",
      icon: Heading2,
      active: state.h2,
      run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "Podtytuł",
      icon: Heading3,
      active: state.h3,
      run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      label: "Lista punktowana",
      icon: List,
      active: state.bullet,
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Lista numerowana",
      icon: ListOrdered,
      active: state.ordered,
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "Cytat",
      icon: Quote,
      active: state.quote,
      run: () => editor.chain().focus().toggleBlockquote().run(),
    },
  ];
  const toolClass =
    "flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-md px-2 text-sm hover:bg-secondary/10 focus-visible:outline-2 focus-visible:outline-secondary disabled:opacity-40";
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-navy">Treść artykułu</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Napisz historię. Zdjęcie dodasz dokładnie w miejscu kursora.
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg border border-border px-4 py-2 text-sm font-bold"
          disabled={busy}
          onClick={() => setPreview(!preview)}
        >
          {preview ? "Wróć do pisania" : "Podgląd"}
        </button>
      </div>
      {preview ? (
        <div className="rounded-xl border border-border bg-background p-6">
          <ArticleBody document={state.json} imageUrls={urls} />
          <ArticleGallery
            urls={gallery
              .map((id) => urls[id])
              .filter((url): url is string => !!url)}
            title="Podgląd artykułu"
          />
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
            <div
              className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/50 p-2"
              role="toolbar"
              aria-label="Formatowanie tekstu"
            >
              {controls.map(({ label, icon: Icon, active, run }) => (
                <button
                  type="button"
                  key={label}
                  title={label}
                  aria-label={label}
                  aria-pressed={active}
                  disabled={busy}
                  onClick={run}
                  className={`${toolClass} ${active ? "bg-secondary/15 text-secondary" : ""}`}
                >
                  <Icon size={18} />
                </button>
              ))}
              <button
                type="button"
                title="Dodaj lub usuń link"
                aria-label="Dodaj lub usuń link"
                disabled={busy}
                className={toolClass}
                onClick={() => {
                  const href = window.prompt(
                    "Adres linku (https://…). Puste pole usuwa link.",
                    editor.getAttributes("link").href ?? "",
                  );
                  if (href === null) return;
                  if (!href.trim()) editor.chain().focus().unsetLink().run();
                  else if (/^https?:\/\//i.test(href))
                    editor
                      .chain()
                      .focus()
                      .extendMarkRange("link")
                      .setLink({ href })
                      .run();
                  else
                    setError(
                      "Link powinien zaczynać się od https:// lub http://",
                    );
                }}
              >
                <LinkIcon size={18} />
              </button>
              <span className="mx-1 h-5 w-px bg-border" />
              <button
                type="button"
                className={toolClass}
                aria-label="Cofnij"
                disabled={busy || !editor.can().undo()}
                onClick={() => editor.chain().focus().undo().run()}
              >
                <Undo2 size={18} />
              </button>
              <button
                type="button"
                className={toolClass}
                aria-label="Ponów"
                disabled={busy || !editor.can().redo()}
                onClick={() => editor.chain().focus().redo().run()}
              >
                <Redo2 size={18} />
              </button>
              <button
                type="button"
                className={`${toolClass} ml-auto font-bold text-secondary`}
                disabled={busy}
                onClick={() => inlineInput.current?.click()}
              >
                <ImagePlus size={18} /> Zdjęcia w treści
              </button>
            </div>
            <EditorContent editor={editor} />
            {state.image && (
              <div className="grid gap-3 border-t border-border bg-muted/40 p-4 sm:grid-cols-2">
                <label className="text-xs font-bold">
                  Opis zdjęcia (dla dostępności)
                  <input
                    className={`${inputClass} mt-1`}
                    value={String(state.attrs.alt ?? "")}
                    onChange={(e) =>
                      editor.commands.updateAttributes("image", {
                        alt: e.target.value,
                      })
                    }
                  />
                </label>
                <label className="text-xs font-bold">
                  Podpis pod zdjęciem
                  <input
                    className={`${inputClass} mt-1`}
                    value={String(state.attrs.title ?? "")}
                    onChange={(e) =>
                      editor.commands.updateAttributes("image", {
                        title: e.target.value,
                      })
                    }
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  {[50, 75, 100].map((width) => (
                    <button
                      type="button"
                      key={width}
                      className={`${toolClass} border border-border`}
                      aria-pressed={state.attrs.width === width}
                      onClick={() =>
                        editor
                          .chain()
                          .focus()
                          .updateAttributes("image", { width })
                          .run()
                      }
                    >
                      {width}%
                    </button>
                  ))}
                  <button
                    type="button"
                    className={toolClass}
                    onClick={() =>
                      editor.chain().focus().deleteSelection().run()
                    }
                  >
                    <Trash2 size={16} />
                    Usuń zdjęcie
                  </button>
                </div>
              </div>
            )}
            <div className="flex justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
              <span>
                {state.words} słów · około{" "}
                {Math.max(1, Math.ceil(state.words / 200))} min czytania
              </span>
              <span>Ctrl / ⌘ + Z — cofnij</span>
            </div>
          </div>
          <section>
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-navy">
                  Galeria na końcu artykułu
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {gallery.length
                    ? `${gallery.length} / 60 zdjęć · ustaw kolejność strzałkami`
                    : "Zdjęcia wyświetlą się w przewijanej galerii z powiększeniem."}
                </p>
              </div>
            </div>
            <div
              className={`rounded-xl border-2 border-dashed p-6 text-center ${dragging ? "border-secondary bg-secondary/10" : "border-border bg-muted/25"}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                void upload(Array.from(e.dataTransfer.files), "gallery");
              }}
            >
              <Images size={28} className="mx-auto mb-3 text-secondary" />
              <button
                type="button"
                disabled={busy}
                onClick={() => galleryInput.current?.click()}
                className="rounded-lg bg-secondary px-5 py-3 text-sm font-bold text-secondary-foreground"
              >
                Wybierz zdjęcia do galerii
              </button>
              <p className="mt-3 text-sm text-muted-foreground">
                lub przeciągnij tutaj wiele plików naraz
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                JPG, PNG, WebP · do 30 MB na plik · automatyczna kompresja
              </p>
            </div>
            {gallery.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {gallery.map((id, i) => (
                  <div
                    key={id}
                    className="overflow-hidden rounded-lg border border-border bg-background"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={urls[id] ?? ""}
                      alt={`Zdjęcie ${i + 1}`}
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <div className="flex items-center justify-between p-1">
                      <span className="pl-2 text-xs font-bold">{i + 1}</span>
                      <div className="flex">
                        <button
                          type="button"
                          aria-label={`Przesuń zdjęcie ${i + 1} wcześniej`}
                          disabled={busy || i === 0}
                          className={toolClass}
                          onClick={() => {
                            const next = [...gallery];
                            [next[i - 1], next[i]] = [next[i], next[i - 1]];
                            changeGallery(next);
                          }}
                        >
                          <ArrowLeft size={15} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Przesuń zdjęcie ${i + 1} dalej`}
                          disabled={busy || i === gallery.length - 1}
                          className={toolClass}
                          onClick={() => {
                            const next = [...gallery];
                            [next[i + 1], next[i]] = [next[i], next[i + 1]];
                            changeGallery(next);
                          }}
                        >
                          <ArrowRight size={15} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Usuń zdjęcie ${i + 1} z galerii`}
                          disabled={busy}
                          className={toolClass}
                          onClick={() =>
                            changeGallery(gallery.filter((x) => x !== id))
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`${toolClass} w-full border-t border-border text-secondary`}
                      disabled={busy || !urls[id]}
                      onClick={() => {
                        if (
                          articleImageIds(editor.getJSON() as ArticleNode)
                            .length >= 60
                        ) {
                          setError("Maksymalnie 60 zdjęć w treści");
                          return;
                        }
                        editor
                          .chain()
                          .focus()
                          .insertContent([
                            {
                              type: "image",
                              attrs: {
                                storageId: id,
                                src: urls[id],
                                alt: "",
                                width: 100,
                              },
                            },
                            { type: "paragraph" },
                          ])
                          .run();
                      }}
                    >
                      <ImagePlus size={15} />
                      Wstaw do treści
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
      <details className="rounded-lg border border-border px-4 py-3 text-sm">
        <summary className="cursor-pointer font-bold">
          Ustawienia przygotowania zdjęć
        </summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label>
            Dłuższy bok
            <select
              className={`${inputClass} mt-1`}
              value={maxEdge}
              disabled={busy}
              onChange={(e) => setMaxEdge(Number(e.target.value))}
            >
              {[1280, 1600, 2000, 2560].map((n) => (
                <option key={n} value={n}>
                  {n} px
                </option>
              ))}
            </select>
          </label>
          <label>
            Jakość
            <select
              className={`${inputClass} mt-1`}
              value={quality}
              disabled={busy}
              onChange={(e) => setQuality(Number(e.target.value))}
            >
              <option value={0.72}>Mniejszy plik</option>
              <option value={0.82}>Zrównoważona (zalecana)</option>
              <option value={0.9}>Wysoka</option>
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Dotyczy kolejnych zdjęć. Zachowujemy proporcje, nie powiększamy małych
          plików i przygotowujemy WebP w przeglądarce przed wysłaniem.
        </p>
      </details>
      <input
        ref={inlineInput}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={(e) => {
          void upload(Array.from(e.target.files ?? []), "inline");
          e.target.value = "";
        }}
      />
      <input
        ref={galleryInput}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={(e) => {
          void upload(Array.from(e.target.files ?? []), "gallery");
          e.target.value = "";
        }}
      />
      {progress && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-lg bg-secondary/10 p-3 text-sm text-secondary"
        >
          {progress}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
    </div>
  );
}
