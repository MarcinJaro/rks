import { PageHeader } from "@/components/shared/PageHeader";
import { PhotoGrid } from "@/components/shared/PhotoGrid";
import { legacyGalleryImages } from "@/data/legacy";

export default function FansGalleryPage() {
  return (
    <>
      <PageHeader
        title="Galeria kibiców"
        description="Archiwalne zdjęcia, stadion przy Radarowej i materiały przypominające klimat niebiesko-białej społeczności."
      />
      <section className="container-page py-12">
        <PhotoGrid
          title="Galeria kibiców"
          aspect="aspect-[16/11]"
          showCaptions
          images={legacyGalleryImages.slice(0, 6).map((image) => ({
            src: image.src,
            alt: image.title,
            caption: image.title,
          }))}
        />
      </section>
    </>
  );
}
