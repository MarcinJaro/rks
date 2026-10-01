"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { GalleryBlock } from "@/components/galleries/GalleryBlock";

/** Galerie przypisane do drużyny w panelu (Galerie → drużyna). */
export function TeamGalleries({ slug }: { slug: string }) {
  const galleries = useQuery(api.galleries.listByTeamSlug, { slug });
  if (!galleries?.length) return null;

  return (
    <section className="mt-12" aria-labelledby="team-galleries">
      <p className="text-sm font-black uppercase text-primary">Galeria</p>
      <h2 id="team-galleries" className="mb-6 mt-2 text-3xl font-black text-white">
        Zdjęcia drużyny
      </h2>
      <div className="space-y-6">
        {galleries.map((gallery) => (
          <GalleryBlock key={gallery._id} gallery={gallery} />
        ))}
      </div>
    </section>
  );
}
