import Image from "next/image";
import { PageHeader } from "@/components/shared/PageHeader";
import { historyTimeline } from "@/data/legacy";

export default function ClubHistoryPage() {
  return (
    <>
      <PageHeader
        title="Historia klubu"
        description="Najważniejsze momenty historii RKS Okęcie Warszawa od założenia przy zakładach Skoda po współczesny klub przy Radarowej."
      />
      <section className="container-page grid gap-10 py-12 lg:grid-cols-[.9fr_1.1fr]">
        <div className="space-y-4">
          <Image
            src="/images/legacy/history-1929.jpg"
            alt="Archiwalne zdjęcie RKS Okęcie"
            width={1200}
            height={678}
            className="rounded-[24px] border border-white/8 object-cover"
          />
          <div className="grid grid-cols-2 gap-4">
            {["history-archive-1.jpg", "history-archive-2.jpg"].map((image) => (
              <Image
                key={image}
                src={`/images/legacy/${image}`}
                alt="Archiwum RKS Okęcie"
                width={1200}
                height={856}
                className="aspect-[4/3] rounded-[20px] border border-white/8 object-cover"
              />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {historyTimeline.map((item) => (
            <article
              key={item.year}
              className="rounded-[20px] border border-white/8 bg-card p-6"
            >
              <p className="text-sm font-black uppercase text-primary">{item.year}</p>
              <h2 className="mt-2 text-2xl font-black text-white">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
