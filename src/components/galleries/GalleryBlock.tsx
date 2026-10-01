"use client";

import Link from "next/link";
import { PhotoGrid } from "@/components/shared/PhotoGrid";
import { descriptionLines } from "@/lib/galleryText";
import { formatDate } from "@/lib/utils";

export type PublicGallery = {
  _id: string;
  title: string;
  date: number;
  description: string | null;
  team: { slug: string; name: string } | null;
  imageUrls: string[];
};

/** Galeria z panelu: tytuł, data, opis i zdjęcia z powiększaniem. */
export function GalleryBlock({
  gallery,
  showTeam = false,
}: {
  gallery: PublicGallery;
  showTeam?: boolean;
}) {
  const lines = descriptionLines(gallery.description);
  const single = gallery.imageUrls.length === 1;

  return (
    <article className="rounded-[24px] border border-white/8 bg-card/60 p-5 shadow-sm sm:p-6">
      <header className="mb-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-black uppercase text-muted-foreground">
          <time dateTime={new Date(gallery.date).toISOString()}>
            {formatDate(gallery.date)}
          </time>
          {showTeam && gallery.team ? (
            <Link
              href={`/druzyny/${gallery.team.slug}`}
              className="text-primary hover:underline"
            >
              {gallery.team.name}
            </Link>
          ) : null}
          {!single ? <span>{gallery.imageUrls.length} zdjęć</span> : null}
        </div>
        <h3 className="mt-2 text-2xl font-black text-white">{gallery.title}</h3>
      </header>
      <PhotoGrid
        title={gallery.title}
        images={gallery.imageUrls.map((src, index) => ({
          src,
          alt: single ? gallery.title : `${gallery.title} — zdjęcie ${index + 1}`,
          // Pojedyncze zdjęcie (np. kadra) - opis z nazwiskami widać też w powiększeniu.
          caption: single ? lines.join(" · ") : null,
        }))}
      />
      {lines.length > 0 ? (
        <div className="mt-4 space-y-1.5 text-sm leading-6 text-muted-foreground">
          {lines.map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
      ) : null}
    </article>
  );
}
