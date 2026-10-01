"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

export function ArticleGallery({
  urls,
  title,
}: {
  urls: string[];
  title: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  if (!urls.length) return null;
  function go(index: number) {
    const next = Math.max(0, Math.min(urls.length - 1, index));
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    track.current?.scrollTo({
      left: next * track.current.clientWidth,
      behavior: reduced ? "instant" : "smooth",
    });
  }
  const arrowClass =
    "grid size-11 shrink-0 place-items-center rounded-full border border-current/25 hover:bg-current/10 disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-4";
  return (
    <section className="mx-auto mt-12 max-w-4xl" aria-label="Galeria zdjęć">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Galeria zdjęć</h2>
          <p className="mt-1 text-sm opacity-70" aria-live="polite">
            {active + 1} / {urls.length}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={arrowClass}
            aria-label="Poprzednie zdjęcie"
            disabled={active === 0}
            onClick={() => go(active - 1)}
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            className={arrowClass}
            aria-label="Następne zdjęcie"
            disabled={active === urls.length - 1}
            onClick={() => go(active + 1)}
          >
            <ChevronRight />
          </button>
        </div>
      </div>
      <div
        ref={track}
        tabIndex={0}
        aria-label="Przewijaj zdjęcia strzałkami lub gestem"
        className="flex snap-x snap-mandatory overflow-x-auto rounded-xl bg-black/10 [scrollbar-width:thin]"
        onScroll={() => {
          if (track.current)
            setActive(
              Math.round(track.current.scrollLeft / track.current.clientWidth),
            );
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            go(active + (e.key === "ArrowRight" ? 1 : -1));
          }
        }}
      >
        {urls.map((url, i) => (
          <button
            type="button"
            key={`${url}-${i}`}
            onClick={() => setExpanded(i)}
            className="group relative aspect-[4/3] w-full shrink-0 snap-center sm:aspect-[3/2]"
            aria-label={`Powiększ zdjęcie ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`${title} — zdjęcie ${i + 1}`}
              loading="lazy"
              className="h-full w-full object-contain"
            />
            <span className="absolute bottom-4 right-4 rounded-full bg-black/65 p-3 text-white">
              <Expand size={18} />
            </span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
        {urls.map((url, i) => (
          <button
            type="button"
            key={`${url}-${i}`}
            aria-label={`Przejdź do zdjęcia ${i + 1}`}
            aria-current={active === i ? "true" : undefined}
            onClick={() => go(i)}
            className={`h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 ${active === i ? "border-current opacity-100" : "border-transparent opacity-50 hover:opacity-100"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>
      <Dialog.Root
        open={expanded !== null}
        onOpenChange={(open) => {
          if (!open) setExpanded(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[110] bg-black/95" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-3 z-[111] flex flex-col items-center justify-center text-white outline-none"
            onKeyDown={(e) => {
              if (e.key === "ArrowRight")
                setExpanded((i) => Math.min(urls.length - 1, (i ?? 0) + 1));
              if (e.key === "ArrowLeft")
                setExpanded((i) => Math.max(0, (i ?? 0) - 1));
            }}
          >
            <Dialog.Title className="sr-only">{title} — galeria</Dialog.Title>
            <Dialog.Close className="absolute right-2 top-2 rounded-full bg-white px-5 py-3 font-bold text-black">
              Zamknij
            </Dialog.Close>
            {expanded !== null && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={urls[expanded]}
                  alt={`${title} — zdjęcie ${expanded + 1}`}
                  className="max-h-[80dvh] max-w-full object-contain"
                />
                <div className="mt-4 flex items-center gap-6">
                  <button
                    type="button"
                    aria-label="Poprzednie zdjęcie"
                    className={arrowClass}
                    disabled={expanded === 0}
                    onClick={() => setExpanded(expanded - 1)}
                  >
                    <ChevronLeft />
                  </button>
                  <span aria-live="polite">
                    {expanded + 1} / {urls.length}
                  </span>
                  <button
                    type="button"
                    aria-label="Następne zdjęcie"
                    className={arrowClass}
                    disabled={expanded === urls.length - 1}
                    onClick={() => setExpanded(expanded + 1)}
                  >
                    <ChevronRight />
                  </button>
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
