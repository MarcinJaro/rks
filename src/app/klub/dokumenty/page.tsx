import { Download, FileText, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Stagger, StaggerItem } from "@/components/shared/Motion";
import { Button } from "@/components/ui/button";
import { legacyDocuments } from "@/data/legacy";

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

          <Stagger className="grid gap-4">
            {legacyDocuments.map(([document, href]) => (
              <StaggerItem key={href}>
                <article className="flex flex-col gap-5 rounded-[18px] border border-white/8 bg-muted p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
                      <FileText size={22} />
                    </span>
                    <div>
                      <h2 className="text-lg font-black text-white">
                        {document}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Dokument PDF
                      </p>
                    </div>
                  </div>
                  <Button asChild variant="outline">
                    <a href={href} target="_blank" rel="noreferrer">
                      <Download size={18} />
                      Pobierz
                    </a>
                  </Button>
                </article>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>
    </>
  );
}
