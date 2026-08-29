import type { Metadata } from "next";
import { ArrowUpRight, ShoppingBag, TriangleAlert } from "lucide-react";
import { MatchKitCard } from "./MatchKitCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { kitInfo } from "@/data/zawodnik";

export const metadata: Metadata = {
  title: "Stroje i sklep klubowy",
  description:
    "Komplet meczowy RKS Okęcie zamawiany mailowo w klubie oraz fanshop NO10 z getrami, dresami i koszulkami treningowymi.",
};

export default function KitPage() {
  return (
    <>
      <PageHeader
        title="Stroje i sklep klubowy"
        description="Komplet meczowy zamawiasz mailowo w klubie. Getry, dresy i koszulki treningowe kupujesz w fanshopie naszego partnera technicznego NO10."
      />

      <section className="container-page py-12">
        <div className="rounded-[20px] border border-primary/40 bg-primary/10 p-6">
          <p className="flex items-start gap-3 text-base leading-7 text-primary">
            <TriangleAlert className="mt-1 shrink-0" size={22} />
            <strong className="font-black">{kitInfo.trainingRule}</strong>
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <MatchKitCard />

          <article className="rounded-[24px] border border-white/8 bg-card p-7">
            <ShoppingBag className="text-primary" size={32} />
            <h2 className="mt-5 text-2xl font-black text-white">
              Fanshop NO10
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              W sklepie klubowym naszego partnera technicznego kupisz resztę
              wyposażenia zawodnika:
            </p>

            <ul className="mt-6 grid gap-2 sm:grid-cols-3">
              {kitInfo.fanshopItems.map((item) => (
                <li
                  key={item}
                  className="rounded-[14px] bg-[var(--surface-raised)] px-4 py-3 text-center text-sm font-bold text-white first-letter:uppercase"
                >
                  {item}
                </li>
              ))}
            </ul>

            <p className="mt-6 text-sm leading-7 text-muted-foreground">
              W fanshopie znajdziesz też odzież kibicowską, akcesoria treningowe
              i obuwie.
            </p>

            <Button asChild className="mt-6" variant="secondary">
              <a
                href={kitInfo.fanshopHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                Przejdź do fanshopu
                <ArrowUpRight size={18} />
              </a>
            </Button>
          </article>
        </div>
      </section>
    </>
  );
}
