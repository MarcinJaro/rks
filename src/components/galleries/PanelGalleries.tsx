"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { GalleryBlock } from "@/components/galleries/GalleryBlock";

/** Najnowsze galerie dodane w panelu; bez galerii sekcja się nie pokazuje. */
export function PanelGalleries() {
  const galleries = useQuery(api.galleries.latest, { limit: 24 });
  const visible = galleries?.filter((gallery) => gallery.imageUrls.length > 0);
  if (!visible?.length) return null;

  return (
    <section className="container-page pt-12" aria-labelledby="panel-galleries">
      <h2 id="panel-galleries" className="mb-6 text-3xl font-black text-white">
        Najnowsze galerie
      </h2>
      <div className="space-y-6">
        {visible.map((gallery) => (
          <GalleryBlock key={gallery._id} gallery={gallery} showTeam />
        ))}
      </div>
    </section>
  );
}
