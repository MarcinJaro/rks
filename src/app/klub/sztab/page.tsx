import Image from "next/image";
import { PageHeader } from "@/components/shared/PageHeader";
import { coaches } from "@/data/legacy";

export default function StaffPage() {
  return (
    <>
      <PageHeader
        title="Sztab szkoleniowy"
        description="Trenerzy prowadzący drużyny RKS Okęcie Warszawa oraz bezpośredni kontakt do grup szkoleniowych."
      />
      <section className="container-page grid gap-5 py-12 sm:grid-cols-2 lg:grid-cols-3">
        {coaches.map((coach) => (
          <article key={coach.name} className="overflow-hidden rounded-[24px] border border-white/8 bg-card">
            <Image
              src={coach.photo}
              alt={coach.name}
              width={600}
              height={800}
              className="aspect-[3/4] w-full object-cover"
            />
            <div className="p-6">
              <h2 className="text-2xl font-black text-white">{coach.name}</h2>
              <p className="mt-2 text-sm font-bold text-primary">{coach.team}</p>
              <div className="mt-5 space-y-2 text-sm text-muted-foreground">
                {coach.phone ? <p>tel. {coach.phone}</p> : null}
                {coach.email ? (
                  <a href={`mailto:${coach.email}`} className="block hover:text-accent">
                    {coach.email}
                  </a>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
