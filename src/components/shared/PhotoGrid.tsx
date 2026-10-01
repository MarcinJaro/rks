"use client";

import Image from "next/image";
import { useState } from "react";
import { Expand } from "lucide-react";
import { Lightbox, type LightboxImage } from "@/components/shared/Lightbox";

/**
 * Siatka miniatur; klik otwiera lightbox na wybranym zdjęciu. Pojedyncze
 * zdjęcie (np. zdjęcie drużynowe) pokazujemy w pełnych proporcjach.
 */
export function PhotoGrid({
  images,
  title,
  columns = "sm:grid-cols-2 lg:grid-cols-3",
  aspect = "aspect-[4/3]",
  showCaptions = false,
}: {
  images: LightboxImage[];
  title: string;
  columns?: string;
  aspect?: string;
  showCaptions?: boolean;
}) {
  const [open, setOpen] = useState<number | null>(null);
  if (images.length === 0) return null;
  const single = images.length === 1;

  return (
    <>
      <div className={single ? "" : `grid gap-4 ${columns}`}>
        {images.map((image, index) => (
          <figure
            key={`${image.src}-${index}`}
            className="group overflow-hidden rounded-[18px] border border-white/8 bg-card shadow-sm"
          >
            <button
              type="button"
              onClick={() => setOpen(index)}
              aria-label={`Powiększ: ${image.alt}`}
              className={`relative block w-full cursor-zoom-in overflow-hidden focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-primary ${
                single ? "" : aspect
              }`}
            >
              {single ? (
                // Zdjęcie drużynowe: cały kadr, bez przycinania.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image.src} alt={image.alt} className="h-auto w-full" />
              ) : (
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
              )}
              <span className="absolute bottom-3 right-3 grid size-10 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                <Expand size={18} />
              </span>
            </button>
            {showCaptions && image.caption ? (
              <figcaption className="p-4 text-sm font-black text-white">
                {image.caption}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
      <Lightbox images={images} index={open} onIndexChange={setOpen} title={title} />
    </>
  );
}
