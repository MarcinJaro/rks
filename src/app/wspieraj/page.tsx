import Image from "next/image";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { clubShop } from "@/data/site";

export default function SupportPage() {
  return (
    <>
      <PageHeader
        title="Wspieraj RKS Okęcie"
        description="Reklama na stadionie, sponsoring i 1,5% podatku na rozwój szkolenia dzieci i młodzieży."
      />
      <section className="container-page grid gap-8 py-12 lg:grid-cols-2">
        <article className="overflow-hidden rounded-[24px] border border-white/8 bg-card shadow-sm">
          <Image
            src="/images/legacy/ad-stadium-1.jpg"
            alt="Reklama na stadionie RKS Okęcie"
            width={1200}
            height={658}
            className="aspect-[16/9] object-cover"
          />
          <div className="p-6">
            <h2 className="text-2xl font-black text-white">
              Reklama na stadionie
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Klub oferuje powierzchnie reklamowe na boisku oraz billboardach
              przy ogrodzeniu stadionu, widocznych od strony ruchliwej ul. Hynka.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              <li>Strefa A: 18 modułów w centralnej strefie.</li>
              <li>Strefa B: 18 modułów po lewej i prawej stronie.</li>
              <li>Wymiary jednego modułu: 250 x 70 cm.</li>
              <li>Kontakt w sprawie oferty: 509 929 800.</li>
            </ul>
            <Button asChild className="mt-6">
              <a href="tel:509929800">Zapytaj o ofertę</a>
            </Button>
          </div>
        </article>

        <article className="overflow-hidden rounded-[24px] border border-white/8 bg-card shadow-sm">
          <Image
            src="/images/legacy/opp-15.png"
            alt="Przekaż 1,5% podatku"
            width={250}
            height={250}
            className="mx-auto mt-8 h-36 w-36 object-contain"
          />
          <div className="p-6">
            <h2 className="text-2xl font-black text-white">1,5% podatku</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              W zeznaniu podatkowym można wesprzeć RKS Okęcie Warszawa,
              wpisując numer KRS klubu. Jako cel szczegółowy warto wskazać
              szkolenie dzieci i młodzieży.
            </p>
            <div className="mt-6 rounded-[18px] bg-primary p-5 text-[#002349]">
              <p className="text-sm font-black uppercase">Numer KRS</p>
              <p className="mt-1 text-3xl font-black">0000021958</p>
            </div>
          </div>
        </article>

        <article className="rounded-[24px] border border-white/8 bg-card p-6 shadow-sm lg:col-span-2">
          <p className="text-sm font-black uppercase text-primary">
            Sklep klubowy
          </p>
          <h2 className="mt-3 text-2xl font-black text-white">
            Pamiątki i odzież RKS Okęcie
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            Klubowy sklep działa pod osobnym adresem. Po otrzymaniu finalnego
            linku do fanshopu NO10 możemy dodać drugi przycisk bezpośrednio do
            kolekcji klubowej.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <a href={clubShop.href} target="_blank" rel="noopener noreferrer">
                Przejdź do sklepu
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="https://www.no10.pl/" target="_blank" rel="noopener noreferrer">
                NO10
              </a>
            </Button>
          </div>
        </article>
      </section>
    </>
  );
}
