import Image from "next/image";
import { PageHeader } from "@/components/shared/PageHeader";
import { Stagger, StaggerItem } from "@/components/shared/Motion";
import { clubLegends } from "@/data/legacy";

export default function FansHistoryPage() {
  return (
    <>
      <PageHeader
        title="Historia kibiców"
        description="Strefa pamięci o klubie: lokalna tożsamość Okęcia, dawni zawodnicy, legendy i ludzie, którzy budowali RKS przy Radarowej."
      />
      <section className="container-page grid gap-8 py-12 lg:grid-cols-[1.1fr_.9fr]">
        <article className="overflow-hidden rounded-[24px] border border-white/8 bg-card shadow-sm">
          <div className="relative aspect-[16/10]">
            <Image
              src="/images/legacy/history-archive-1.jpg"
              alt="Archiwalne zdjęcie RKS Okęcie Warszawa"
              fill
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="p-7">
            <p className="text-sm font-black uppercase text-primary">
              Klub z Włoch
            </p>
            <h2 className="mt-3 text-3xl font-black uppercase text-white">
              Okęcie to więcej niż wynik
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Od 1929 roku wokół Okęcia tworzyła się społeczność ludzi
              związanych z klubem, dzielnicą i stadionem przy Radarowej. To
              historia zawodników, trenerów, działaczy, rodzin i kibiców, którzy
              przez kolejne dekady budowali niebiesko-białą tożsamość RKS-u.
            </p>
          </div>
        </article>

        <div className="rounded-[24px] border border-white/8 bg-muted p-7">
          <p className="text-sm font-black uppercase text-primary">
            Legendy RKS
          </p>
          <h2 className="mt-3 text-2xl font-black uppercase text-white">
            Ludzie, którzy zapisali się w historii
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            Wśród osób związanych z Okęciem są piłkarze, trenerzy i wychowankowie
            rozpoznawalni nie tylko przy Radarowej. Ich nazwiska przypominają, że
            klub od zawsze był ważnym miejscem na sportowej mapie Warszawy.
          </p>
          <Stagger className="mt-6 grid gap-3 sm:grid-cols-2">
            {clubLegends.map((name) => (
              <StaggerItem key={name}>
                <div className="rounded-md border border-white/8 bg-card px-4 py-3 text-sm font-black text-white">
                  {name}
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>
    </>
  );
}
