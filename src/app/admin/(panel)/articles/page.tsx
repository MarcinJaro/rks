import { PageHeader } from "@/components/shared/PageHeader";

export default function AdminArticlesPage() {
  return (
    <>
      <PageHeader
        title="Artykuły"
        description="Zarządzanie klubowymi aktualnościami, publikacją artykułów i ustawieniami SEO."
      />
      <section className="container-page py-12">
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          Wybierz artykuł z listy, aby edytować treść, zdjęcie główne, status
          publikacji i opis widoczny w wyszukiwarkach.
        </div>
      </section>
    </>
  );
}
