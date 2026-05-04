import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";

export default function AdminPage() {
  return (
    <>
      <PageHeader
        title="Admin"
        description="Panel administracyjny do zarządzania treściami klubowymi, aktualnościami i drużynami."
      />
      <section className="container-page grid gap-4 py-12 md:grid-cols-3">
        {[
          ["Posty FB", "/admin/fb-posts"],
          ["Artykuły", "/admin/articles"],
          ["Drużyny", "/admin/teams"],
        ].map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="rounded-lg border border-border bg-card p-6 text-xl font-black text-navy shadow-sm hover:border-primary hover:text-primary"
          >
            {label}
          </Link>
        ))}
      </section>
    </>
  );
}
