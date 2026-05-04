import { Music2, Shield, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";

const songSections = [
  {
    title: "Doping meczowy",
    body: "Krótkie, rytmiczne przyśpiewki używane przy okazji spotkań seniorów i meczów przy Radarowej.",
    icon: Music2,
  },
  {
    title: "Barwy i tożsamość",
    body: "Materiały kibicowskie o niebiesko-białych barwach, historii klubu i lokalnej dumie Okęcia.",
    icon: Shield,
  },
  {
    title: "Szacunek i energia",
    body: "Doping ma nieść drużynę i budować atmosferę, z której klub i młodzi zawodnicy mogą być dumni.",
    icon: UsersRound,
  },
];

export default function SongsPage() {
  return (
    <>
      <PageHeader
        title="Śpiewnik"
        description="Niebiesko-biały doping, klubowa tożsamość i atmosfera meczów przy Radarowej."
      />
      <section className="container-page py-12">
        <div className="rounded-[24px] border border-white/8 bg-card p-7 shadow-sm">
          <p className="text-sm font-black uppercase text-primary">
            Strefa kibica
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-black uppercase text-white">
            Głośno, rytmicznie, po okęcku
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
            Śpiewnik zbiera najważniejsze motywy dopingu RKS Okęcie: wsparcie
            dla drużyny, dumę z barw i przywiązanie do klubu z Radarowej.
            Najważniejsze jest jedno: stadion ma pomagać zawodnikom grać
            odważniej.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {songSections.map((section) => {
              const Icon = section.icon;

              return (
                <article
                  key={section.title}
                  className="rounded-[18px] border border-white/8 bg-muted p-5"
                >
                  <Icon className="text-primary" size={26} />
                  <h3 className="mt-4 text-lg font-black text-white">
                    {section.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {section.body}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
