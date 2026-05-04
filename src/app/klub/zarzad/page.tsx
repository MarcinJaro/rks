import { PageHeader } from "@/components/shared/PageHeader";
import { boardMembers } from "@/data/legacy";

export default function BoardPage() {
  return (
    <>
      <PageHeader
        title="Zarząd klubu"
        description="Aktualny skład zarządu RKS Okęcie Warszawa przeniesiony z obecnej strony klubu."
      />
      <section className="container-page grid gap-4 py-12 md:grid-cols-2 lg:grid-cols-3">
        {boardMembers.map(([name, role, email]) => (
          <article key={name} className="rounded-[20px] border border-white/8 bg-card p-6">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-accent text-lg font-black text-[#002e5e]">
              {name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
            </div>
            <h2 className="mt-6 text-2xl font-black text-white">{name}</h2>
            <p className="mt-2 text-sm font-bold text-primary">{role}</p>
            {email ? (
              <a href={`mailto:${email}`} className="mt-5 block text-sm text-muted-foreground hover:text-accent">
                {email}
              </a>
            ) : null}
          </article>
        ))}
      </section>
    </>
  );
}
