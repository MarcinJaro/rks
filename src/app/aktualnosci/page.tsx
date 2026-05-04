import { FacebookFeedGrid } from "@/components/facebook/FacebookFeedGrid";
import { PageHeader } from "@/components/shared/PageHeader";

export default function NewsPage() {
  return (
    <>
      <PageHeader
        title="Aktualności"
        description="Najnowsze informacje z życia klubu: mecze, treningi, nabory, turnieje i komunikaty organizacyjne."
      />
      <section className="container-page py-12">
        <div className="mb-8 flex flex-wrap gap-2">
          {["Wszystko", "Z klubu", "Akademia", "Mecze", "Treningi", "Turnieje"].map(
            (filter) => (
              <button
                key={filter}
                className="rounded-md border border-border bg-card px-4 py-2 text-sm font-bold text-muted-foreground hover:border-primary hover:text-primary"
              >
                {filter}
              </button>
            ),
          )}
        </div>
        <FacebookFeedGrid
          limit={12}
          source="all"
          className="grid gap-5 md:grid-cols-3"
        />
      </section>
    </>
  );
}
