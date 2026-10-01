"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";

export type LightboxImage = {
  src: string;
  alt: string;
  caption?: string | null;
};

/**
 * Pełnoekranowy podgląd zdjęć: strzałki, klawiatura (←/→/Home/End/Esc),
 * przesunięcie palcem, miniatury i podpis. Sterowany indeksem - `null`
 * zamyka okno.
 */
export function Lightbox({
  images,
  index,
  onIndexChange,
  title,
}: {
  images: LightboxImage[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
  title: string;
}) {
  const open = index !== null && images.length > 0;
  const current = open ? Math.min(index, images.length - 1) : 0;
  const image = images[current];
  const count = images.length;
  const [loaded, setLoaded] = useState<string | null>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const thumbs = useRef<HTMLDivElement>(null);

  function go(next: number) {
    onIndexChange(Math.max(0, Math.min(count - 1, next)));
  }

  // Sąsiednie zdjęcia ładujemy z wyprzedzeniem, żeby przewijanie było płynne.
  useEffect(() => {
    if (!open) return;
    for (const neighbour of [current - 1, current + 1]) {
      const src = images[neighbour]?.src;
      if (src) new window.Image().src = src;
    }
  }, [open, current, images]);

  useEffect(() => {
    if (!open) return;
    thumbs.current
      ?.querySelector<HTMLElement>(`[data-index="${current}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [open, current]);

  function onPointerDown(event: PointerEvent) {
    if (event.pointerType === "mouse") return;
    swipeStart.current = { x: event.clientX, y: event.clientY };
  }

  function onPointerUp(event: PointerEvent) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    go(current + (dx < 0 ? 1 : -1));
  }

  const navButton =
    "grid size-12 place-items-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-25";

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onIndexChange(null);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="lightbox-fade fixed inset-0 z-[110] bg-[#040b16]/95 backdrop-blur-md" />
        <Dialog.Content
          aria-describedby={undefined}
          className="lightbox-fade fixed inset-0 z-[111] flex flex-col text-white outline-none"
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") go(current + 1);
            else if (event.key === "ArrowLeft") go(current - 1);
            else if (event.key === "Home") go(0);
            else if (event.key === "End") go(count - 1);
            else return;
            event.preventDefault();
          }}
        >
          <header className="flex items-center gap-3 px-4 pb-2 pt-4 sm:px-6">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="truncate text-sm font-black uppercase tracking-wide text-white/90">
                {title}
              </Dialog.Title>
              {count > 1 ? (
                <p className="mt-0.5 text-xs font-bold text-white/55" aria-live="polite">
                  Zdjęcie {current + 1} z {count}
                </p>
              ) : null}
            </div>
            {image ? (
              <a
                href={image.src}
                target="_blank"
                rel="noopener noreferrer"
                className={`${navButton} size-11`}
                aria-label="Otwórz oryginał w nowej karcie"
                title="Otwórz oryginał"
              >
                <ExternalLink size={18} />
              </a>
            ) : null}
            <Dialog.Close className={`${navButton} size-11`} aria-label="Zamknij podgląd">
              <X size={22} />
            </Dialog.Close>
          </header>

          <div
            className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center px-2 sm:px-20"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={() => (swipeStart.current = null)}
            onClick={(event) => {
              // Klik w tło (poza zdjęciem) zamyka podgląd.
              if (event.target === event.currentTarget) onIndexChange(null);
            }}
          >
            {image ? (
              <figure className="flex max-h-full min-h-0 max-w-full flex-col items-center">
                {loaded !== image.src ? (
                  <span
                    aria-hidden
                    className="absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border-2 border-white/20 border-t-primary"
                  />
                ) : null}
                {/* Pełna rozdzielczość z magazynu - wymiary znane dopiero po wczytaniu. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={image.src}
                  src={image.src}
                  alt={image.alt}
                  onLoad={() => setLoaded(image.src)}
                  className={`lightbox-zoom max-h-[calc(100dvh-13rem)] max-w-full select-none rounded-lg object-contain shadow-2xl shadow-black/60 transition-opacity duration-300 ${
                    loaded === image.src ? "opacity-100" : "opacity-0"
                  } ${count > 1 ? "" : "sm:max-h-[calc(100dvh-8rem)]"}`}
                  draggable={false}
                />
                {image.caption ? (
                  <figcaption className="mt-3 max-h-24 max-w-3xl overflow-y-auto px-2 text-center text-sm leading-6 text-white/80">
                    {image.caption}
                  </figcaption>
                ) : null}
              </figure>
            ) : null}

            {count > 1 ? (
              <>
                <button
                  type="button"
                  className={`${navButton} absolute left-4 top-1/2 hidden -translate-y-1/2 sm:grid`}
                  aria-label="Poprzednie zdjęcie"
                  disabled={current === 0}
                  onClick={() => go(current - 1)}
                >
                  <ChevronLeft size={26} />
                </button>
                <button
                  type="button"
                  className={`${navButton} absolute right-4 top-1/2 hidden -translate-y-1/2 sm:grid`}
                  aria-label="Następne zdjęcie"
                  disabled={current === count - 1}
                  onClick={() => go(current + 1)}
                >
                  <ChevronRight size={26} />
                </button>
              </>
            ) : null}
          </div>

          {count > 1 ? (
            <footer className="flex items-center gap-3 px-3 pb-4 pt-3 sm:px-6">
              <button
                type="button"
                className={`${navButton} shrink-0 sm:hidden`}
                aria-label="Poprzednie zdjęcie"
                disabled={current === 0}
                onClick={() => go(current - 1)}
              >
                <ChevronLeft size={22} />
              </button>
              <div
                ref={thumbs}
                className="mx-auto flex min-w-0 gap-2 overflow-x-auto py-1 [scrollbar-width:none]"
              >
                {images.map((thumb, i) => (
                  <button
                    type="button"
                    key={`${thumb.src}-${i}`}
                    data-index={i}
                    aria-label={`Pokaż zdjęcie ${i + 1}`}
                    aria-current={i === current ? "true" : undefined}
                    onClick={() => go(i)}
                    className={`h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 transition ${
                      i === current
                        ? "border-primary opacity-100"
                        : "border-transparent opacity-45 hover:opacity-90"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumb.src} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={`${navButton} shrink-0 sm:hidden`}
                aria-label="Następne zdjęcie"
                disabled={current === count - 1}
                onClick={() => go(current + 1)}
              >
                <ChevronRight size={22} />
              </button>
            </footer>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
