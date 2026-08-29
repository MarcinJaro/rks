import type { Metadata } from "next";
import { Download, ScrollText } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { RegulationForm } from "./RegulationForm";

export const metadata: Metadata = {
  title: "Regulamin klubu i akceptacja",
  description:
    "Regulamin RKS Okęcie Warszawa do pobrania oraz formularz akceptacji regulaminu dla rodziców zawodników Akademii.",
};

export default function RegulationPage() {
  return (
    <>
      <PageHeader
        title="Regulamin klubu"
        description="Akceptacja regulaminu jest jednym z warunków uczestnictwa w zajęciach Akademii. Zapoznaj się z dokumentem, a następnie potwierdź to w formularzu."
      />

      <section className="container-page grid gap-8 py-12 lg:grid-cols-[.85fr_1.15fr]">
        <article className="h-fit rounded-[24px] border border-white/8 bg-card p-7">
          <ScrollText className="text-primary" size={34} />
          <h2 className="mt-5 text-2xl font-black text-white">
            Regulamin do pobrania
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            Prosimy o zapoznanie się z pełną treścią regulaminu przed
            wypełnieniem formularza. Dokument opisuje zasady uczestnictwa w
            zajęciach, obowiązki zawodnika i rodzica oraz kwestie
            organizacyjne.
          </p>
          <Button asChild className="mt-6" variant="outline">
            <a
              href="/documents/regulamin.pdf"
              target="_blank"
              rel="noreferrer"
            >
              <Download size={18} />
              Regulamin klubu (PDF)
            </a>
          </Button>
        </article>

        <RegulationForm />
      </section>
    </>
  );
}
