import { NewsFeed } from "@/components/facebook/NewsFeed";
import { PageHeader } from "@/components/shared/PageHeader";

export default function NewsPage() {
  return (
    <>
      <PageHeader
        title="Aktualności"
        description="Najnowsze informacje z życia klubu: mecze, treningi, nabory, turnieje i komunikaty organizacyjne."
      />
      <section className="container-page py-12">
        <NewsFeed />
      </section>
    </>
  );
}
