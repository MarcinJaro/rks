import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DocumentsList } from "@/components/club/DocumentsList";

export default function DocumentsPage() {
  return (
    <>
      <PageHeader
        title="Dokumenty"
        description="Najważniejsze dokumenty klubowe: statut, regulaminy, deklaracje i polityki bezpieczeństwa."
      />
      <section className="container-page py-12">
        <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
          <article className="rounded-[24px] border border-white/8 bg-card p-7 shadow-sm">
            <ShieldCheck className="text-primary" size={34} />
            <h2 className="mt-5 text-2xl font-black uppercase text-white">
              Pakiet dla zawodników i rodziców
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Te pliki warto mieć pod ręką przed rozpoczęciem treningów:
              deklaracja członkowska, regulamin klubu oraz dokumenty dotyczące
              bezpieczeństwa dzieci.
            </p>
          </article>

          <DocumentsList />
        </div>
      </section>
    </>
  );
}
