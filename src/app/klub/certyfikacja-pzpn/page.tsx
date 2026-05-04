import Image from "next/image";
import { PageHeader } from "@/components/shared/PageHeader";

export default function PzpnPage() {
  return (
    <>
      <PageHeader
        title="Certyfikacja PZPN"
        description="Akademia RKS Okęcie Warszawa uczestniczy w oficjalnym programie Certyfikacji PZPN dla szkółek piłkarskich."
      />
      <section className="container-page grid gap-8 py-12 lg:grid-cols-[.8fr_1.2fr]">
        <div className="rounded-[24px] border border-white/8 bg-card p-8">
          <Image
            src="/images/legacy/pzpn-silver.png"
            alt="Srebrny certyfikat PZPN"
            width={300}
            height={300}
            className="mx-auto"
          />
          <h2 className="mt-8 text-center text-3xl font-black text-white">
            Srebrny certyfikat
          </h2>
          <p className="mt-4 text-center text-sm leading-7 text-muted-foreground">
            Certyfikacja porządkuje standardy szkolenia, kwalifikacje trenerów,
            bezpieczeństwo i organizację zajęć w kategoriach dziecięcych.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["Kwalifikacje trenerów", "W grupach szkoleniowych wymagane są odpowiednie licencje trenerskie UEFA/PZPN oraz proporcja trenerów do liczby zawodników."],
            ["Infrastruktura", "Szkółka musi mieć prawo do korzystania z boisk dostosowanych do wieku zawodników i wymagań programu."],
            ["Program szkoleniowy", "Zajęcia powinny realizować założenia programu szkolenia PZPN i być planowane z wyprzedzeniem."],
            ["Sprzęt i opieka", "Wymagane są piłki, bramki i sprzęt zgodne z kategoriami wiekowymi oraz formalne zgody rodziców."],
          ].map(([title, body]) => (
            <article key={title} className="rounded-[20px] border border-white/8 bg-card p-6">
              <h2 className="text-xl font-black text-white">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{body}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
