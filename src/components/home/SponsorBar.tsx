import { FadeIn } from "@/components/shared/Motion";

const sponsors = ["STF", "Partner", "Elite", "Warszawa", "Okęcie"];

export function SponsorBar() {
  return (
    <section className="border-y border-white/5 bg-[var(--sponsor-bg)] py-14">
      <div className="container-page">
        <FadeIn>
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-black uppercase tracking-[0.45em] text-white/65">
              Sponsorzy Strategiczni
            </p>
            <div className="grid flex-1 grid-cols-2 gap-6 sm:grid-cols-5 md:max-w-3xl">
              {sponsors.map((sponsor, index) => (
                <div
                  key={sponsor}
                  className="grid h-12 place-items-center rounded-md bg-[var(--sponsor-pill)] text-xs font-black uppercase text-white/70"
                >
                  {index === 0 ? "RKS" : sponsor}
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
