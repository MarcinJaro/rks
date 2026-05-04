import { PageHeader } from "@/components/shared/PageHeader";

export default function AdminTeamsPage() {
  return (
    <>
      <PageHeader
        title="Drużyny"
        description="Zarządzanie opisami, harmonogramami treningów, trenerami i kolejnością drużyn."
      />
      <section className="container-page py-12">
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          W tym miejscu można aktualizować informacje o zespołach, od seniorów
          po najmłodsze roczniki Akademii.
        </div>
      </section>
    </>
  );
}
