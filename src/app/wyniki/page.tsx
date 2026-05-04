import { MatchCenter } from "@/components/home/MatchCenter";
import { PageHeader } from "@/components/shared/PageHeader";

export default function ResultsPage() {
  return (
    <>
      <PageHeader
        title="Wyniki"
        description="Rezultaty ostatnich spotkań i najważniejsze informacje meczowe drużyn RKS Okęcie Warszawa."
      />
      <MatchCenter />
    </>
  );
}
