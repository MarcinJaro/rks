import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { fallbackPosts, teams } from "@/data/site";
import { FeedItem } from "@/components/facebook/FeedItem";

export function generateStaticParams() {
  return teams.map((team) => ({ slug: team.slug }));
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const team = teams.find((item) => item.slug === slug);

  if (!team) notFound();

  return (
    <>
      <PageHeader
        title={team.name}
        description="Informacje o drużynie, aktualności, rozgrywki oraz kontakt organizacyjny dla zawodników i rodziców."
      />
      <section className="container-page grid gap-8 py-12 lg:grid-cols-[.8fr_1.2fr]">
        <aside className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="text-2xl font-black text-navy">Informacje</h2>
          <dl className="mt-6 space-y-4 text-sm">
            <div>
              <dt className="font-black uppercase text-muted-foreground">
                Rozgrywki
              </dt>
              <dd className="mt-1 text-foreground">
                {team.league || `Rocznik ${team.yearGroup}`}
              </dd>
            </div>
            <div>
              <dt className="font-black uppercase text-muted-foreground">
                Treningi
              </dt>
              <dd className="mt-1 text-foreground">
                Aktualne terminy treningów potwierdza trener prowadzący daną
                grupę.
              </dd>
            </div>
          </dl>
        </aside>
        <div>
          <h2 className="mb-5 text-2xl font-black text-navy">
            Aktualności drużyny
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            {fallbackPosts.slice(0, 2).map((post) => (
              <FeedItem key={post.title} {...post} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
