import { PageHeader } from "@/components/shared/PageHeader";
import { BoardGrid } from "@/components/club/BoardGrid";

export default function BoardPage() {
  return (
    <>
      <PageHeader
        title="Zarząd klubu"
        description="Aktualny skład zarządu RKS Okęcie Warszawa przeniesiony z obecnej strony klubu."
      />
      <BoardGrid />
    </>
  );
}
