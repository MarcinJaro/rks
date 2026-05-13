import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/shared/Motion";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-background text-white">
      <Image
        src="/images/figma/hero-stadium.png"
        alt="Stadion RKS Okęcie Warszawa przy ul. Radarowej"
        fill
        priority
        sizes="100vw"
        className="object-cover object-[center_78%] opacity-80"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,14,27,.08)_0%,rgba(9,14,27,.14)_36%,var(--hero-overlay-end)_88%)]" />

      <div className="container-page relative pt-28 pb-16 md:pt-36">
        <FadeIn>
          <div className="max-w-4xl">
            <div className="mb-12 inline-flex items-center gap-2 rounded-full border border-[#f3ffca]/35 bg-[#f3ffca]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#f3ffca]">
              <span className="h-2 w-2 rounded-full bg-[#f3ffca]" />
              Live z Okęcia
            </div>
            <h1 className="max-w-4xl text-[4rem] font-black uppercase leading-[.88] tracking-normal sm:text-8xl lg:text-[8rem]">
              <span className="text-accent">RKS</span>{" "}
              <span className="text-[#e4e7fb]">Okęcie</span>
              <span className="block text-accent">Warszawa</span>
            </h1>
            <p className="mt-8 max-w-2xl text-xl font-light leading-8 text-[#a6aabc] sm:text-2xl">
              Ponad 90 lat tradycji na warszawskich Włochach. Pasja, walka i
              lokalna duma.
            </p>
            <div className="mt-12 flex flex-col gap-5 sm:flex-row">
              <Button asChild size="lg" className="h-[60px] rounded-full px-16 text-base text-[#516700]">
                <Link href="/kontakt">
                  Dołącz do nas <ArrowRight size={20} />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-[60px] rounded-full border-white/15 bg-white/5 px-12 text-base text-white hover:bg-white/10"
              >
                <Link href="/wyniki">Terminarz Gier</Link>
              </Button>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.2} className="mt-32">
          <div className="figma-card relative overflow-hidden rounded-[32px] bg-[var(--hero-panel)] p-8 md:p-12">
            <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_center,#1f3d73_0%,transparent_58%)] opacity-50 md:block" />
            <div className="relative grid gap-8 lg:grid-cols-[1fr_1.4fr_auto] lg:items-center">
              <div>
                <p className="text-base font-black uppercase tracking-[0.1em] text-[#f3ffca]">
                  Radarowa 1
                </p>
                <p className="mt-3 text-base text-[#a6aabc]">
                  Dom RKS Okęcie Warszawa
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ["1929", "rok założenia"],
                  ["13+", "grup szkoleniowych"],
                  ["900", "miejsc na stadionie"],
                ].map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-[18px] border border-white/8 bg-white/5 p-5"
                  >
                    <p className="text-4xl font-black text-accent">{value}</p>
                    <p className="mt-2 text-sm font-bold text-[#a6aabc]">
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid gap-5 lg:justify-items-end">
                <p className="flex items-center gap-2 text-sm text-[#a6aabc]">
                  <MapPin size={16} /> Stadion RKS Okęcie, ul. Radarowa 1
                </p>
                <Button
                  asChild
                  variant="secondary"
                  className="rounded-full px-9 text-[#002349]"
                >
                  <Link href="/wyniki">Wyniki i terminarz</Link>
                </Button>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
