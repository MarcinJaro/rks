import Image from "next/image";
import { PageHeader } from "@/components/shared/PageHeader";
import { Stagger, StaggerItem } from "@/components/shared/Motion";
import { legacyGalleryImages } from "@/data/legacy";

export default function GalleryPage() {
  return (
    <>
      <PageHeader
        title="Galeria"
        description="Pierwsza paczka zdjęć przeniesiona ze starego serwisu: historia klubu, stadion i materiały przy Radarowej."
      />
      <section className="container-page py-12">
        <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {legacyGalleryImages.map((image) => (
            <StaggerItem key={image.src}>
              <figure className="group overflow-hidden rounded-[18px] border border-white/8 bg-card shadow-sm">
                <div className="relative aspect-[4/3]">
                  <Image
                    src={image.src}
                    alt={image.title}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <figcaption className="p-4 text-sm font-black text-white">
                  {image.title}
                </figcaption>
              </figure>
            </StaggerItem>
          ))}
        </Stagger>
      </section>
    </>
  );
}
