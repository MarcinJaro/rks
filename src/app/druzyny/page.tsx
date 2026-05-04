import { TeamsGrid } from "@/components/home/TeamsGrid";
import { PageHeader } from "@/components/shared/PageHeader";

export default function TeamsPage() {
  return (
    <>
      <PageHeader
        title="Drużyny"
        description="Seniorzy, rezerwy, roczniki młodzieżowe oraz oldboye w jednej, prostej strukturze."
      />
      <TeamsGrid />
    </>
  );
}
