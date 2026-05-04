import { CalendarDays, MapPin } from "lucide-react";
import { SectionHeading } from "@/components/shared/SectionHeading";

export function NextMatch() {
  return (
    <section className="container-page py-12">
      <SectionHeading eyebrow="Terminarz" title="Najbliższe spotkanie">
        Najważniejsze informacje przed kolejnym meczem seniorów: rywal, termin
        i miejsce spotkania przy Radarowej.
      </SectionHeading>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
        <div className="rounded-lg border border-white/8 bg-card p-6 shadow-sm shadow-black/20">
          <p className="text-sm font-black uppercase text-primary">
            Liga okręgowa, grupa Warszawa II
          </p>
          <h3 className="mt-4 text-3xl font-black tracking-normal text-white">
            RKS Okęcie Warszawa - STF Champion Warszawa
          </h3>
          <div className="mt-6 grid gap-3 text-sm font-bold text-muted-foreground sm:grid-cols-2">
            <p className="flex items-center gap-2">
              <CalendarDays size={18} /> Środa, 22 kwietnia 2026, 17:00
            </p>
            <p className="flex items-center gap-2">
              <MapPin size={18} /> Stadion RKS Okęcie, Radarowa 1
            </p>
          </div>
        </div>
        <div className="rounded-lg bg-secondary p-6 text-white">
          <p className="text-sm font-black uppercase text-primary-foreground">
            Radarowa 1
          </p>
          <p className="mt-4 text-4xl font-black">Gramy u siebie</p>
          <p className="mt-3 text-sm leading-6 text-white/75">
            Przyjdź wcześniej, zabierz klubowe barwy i wesprzyj RKS z trybun.
          </p>
        </div>
      </div>
    </section>
  );
}
