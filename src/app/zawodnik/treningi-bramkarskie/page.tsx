import type { Metadata } from "next";
import { Hand, Phone } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { goalkeeperTraining } from "@/data/zawodnik";
import { telHref } from "@/lib/phone";

export const metadata: Metadata = {
  title: "Treningi bramkarskie",
  description:
    "Zajęcia bramkarskie w RKS Okęcie - kontakt do trenera prowadzącego szkolenie bramkarzy.",
};

export default function GoalkeeperTrainingPage() {
  return (
    <>
      <PageHeader
        title="Treningi bramkarskie"
        description="Bramkarze naszych roczników trenują pod okiem osobnego trenera. Zapisy i szczegóły organizacyjne bezpośrednio u prowadzącego."
      />

      <section className="container-page py-12">
        <article className="max-w-xl rounded-[24px] border border-white/8 bg-card p-7">
          <Hand className="text-primary" size={32} />
          <p className="mt-5 text-sm font-black uppercase text-primary">
            Trener bramkarzy
          </p>
          <h2 className="mt-2 text-3xl font-black text-white">
            {goalkeeperTraining.coach}
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            W sprawie zapisów, terminów i szczegółów zajęć bramkarskich
            skontaktuj się telefonicznie.
          </p>
          <Button asChild className="mt-6">
            <a href={telHref(goalkeeperTraining.phone)}>
              <Phone size={18} />
              {goalkeeperTraining.phone}
            </a>
          </Button>
        </article>
      </section>
    </>
  );
}
