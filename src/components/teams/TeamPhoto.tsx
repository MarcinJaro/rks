"use client";

import Image from "next/image";
import { useState } from "react";
import { useQuery } from "convex/react";
import { Expand } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Lightbox } from "@/components/shared/Lightbox";
import type { CampPhoto } from "@/data/campPhotos";

/**
 * Zdjęcie grupowe na górze strony drużyny. Zdjęcie wgrane w panelu
 * (Drużyny → zdjęcie) ma pierwszeństwo przed statycznym zdjęciem z obozu.
 */
export function TeamPhoto({
  slug,
  teamName,
  campPhoto,
}: {
  slug: string;
  teamName: string;
  campPhoto?: CampPhoto;
}) {
  const panelUrl = useQuery(api.teams.groupPhotoBySlug, { slug });
  const [zoomed, setZoomed] = useState(false);

  const photo = panelUrl
    ? { src: panelUrl, caption: `${teamName} - zdjęcie drużyny` }
    : campPhoto
      ? { src: campPhoto.src, caption: "Obóz letni 2026" }
      : null;
  if (!photo) return null;
  const portrait = !panelUrl && campPhoto && campPhoto.height > campPhoto.width;

  return (
    <figure className="group mb-10 overflow-hidden rounded-[24px] border border-white/8 bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setZoomed(true)}
        aria-label={`Powiększ zdjęcie: ${photo.caption}`}
        className="relative block w-full cursor-zoom-in focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-primary"
      >
        {panelUrl ? (
          // Wymiary zdjęcia z panelu znamy dopiero po wczytaniu.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={panelUrl} alt={photo.caption} className="h-auto w-full" />
        ) : campPhoto ? (
          <Image
            src={campPhoto.src}
            alt={`${teamName} - zdjęcie grupowe z obozu letniego`}
            width={campPhoto.width}
            height={campPhoto.height}
            sizes="(min-width: 1024px) 720px, 100vw"
            className={portrait ? "mx-auto h-auto w-full max-w-xl" : "h-auto w-full"}
            priority
          />
        ) : null}
        <span className="absolute bottom-3 right-3 grid size-10 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          <Expand size={18} />
        </span>
      </button>
      <figcaption className="px-5 py-4 text-sm font-bold text-muted-foreground">
        {panelUrl ? "Zdjęcie drużyny" : photo.caption}
      </figcaption>
      <Lightbox
        images={[{ src: photo.src, alt: photo.caption }]}
        index={zoomed ? 0 : null}
        onIndexChange={(next) => setZoomed(next !== null)}
        title={teamName}
      />
    </figure>
  );
}
