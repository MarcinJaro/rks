import { PageHeader } from "@/components/shared/PageHeader";

export default function AdminFacebookPostsPage() {
  return (
    <>
      <PageHeader
        title="Moderacja postów FB"
        description="Zarządzanie widocznością, przypięciem i kategoriami postów wyświetlanych na stronie."
      />
      <section className="container-page py-12">
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          Posty można oznaczać jako wyróżnione, ukrywać z widoku publicznego
          oraz przypisywać do drużyn i kategorii tematycznych.
        </div>
      </section>
    </>
  );
}
