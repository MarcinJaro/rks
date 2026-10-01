import { PageHeader } from "@/components/shared/PageHeader";
import { PhotoGrid } from "@/components/shared/PhotoGrid";
import { PanelGalleries } from "@/components/galleries/PanelGalleries";
import { legacyGalleryImages } from "@/data/legacy";

export default function GalleryPage() {
  return (
    <>
      <PageHeader
        title="Galeria"
        description="Zdjęcia drużyn i wydarzeń klubowych oraz archiwum przeniesione ze starego serwisu: historia klubu, stadion i materiały przy Radarowej."
      />
      <PanelGalleries />
      <section className="container-page py-12" aria-labelledby="archive-gallery">
        <h2 id="archive-gallery" className="mb-6 text-3xl font-black text-white">
          Archiwum
        </h2>
        <PhotoGrid
          title="Archiwum RKS Okęcie"
          columns="sm:grid-cols-2 lg:grid-cols-4"
          showCaptions
          images={legacyGalleryImages.map((image) => ({
            src: image.src,
            alt: image.title,
            caption: image.title,
          }))}
        />
      </section>
    </>
  );
}
