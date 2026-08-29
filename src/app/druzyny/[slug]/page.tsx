import { notFound } from "next/navigation";
import Image from "next/image";
import { Mail, Phone } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { teams } from "@/data/site";
import { getTeamRoster } from "@/data/roster";
import { teamContacts } from "@/data/legacy";
import { teamCampPhotos } from "@/data/campPhotos";
import { PersonCard } from "@/components/teams/PersonCard";
import { TeamRoster } from "@/components/teams/TeamRoster";
import { TeamNews } from "@/components/teams/TeamNews";
import { telHref } from "@/lib/phone";

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

  const roster = getTeamRoster(team.slug);
  const teamContact = teamContacts[team.slug];
  const campPhoto = teamCampPhotos[team.slug];

  return (
    <>
      <PageHeader
        title={team.name}
        description="Informacje o drużynie, aktualności, rozgrywki oraz kontakt organizacyjny dla zawodników i rodziców."
      />
      <section className="container-page grid gap-8 py-12 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {campPhoto ? (
            <figure className="mb-10 overflow-hidden rounded-[24px] border border-white/8 bg-card shadow-sm">
              <Image
                src={campPhoto.src}
                alt={`${team.name} - zdjęcie grupowe z obozu letniego`}
                width={campPhoto.width}
                height={campPhoto.height}
                sizes="(min-width: 1024px) 720px, 100vw"
                className={
                  campPhoto.height > campPhoto.width
                    ? "mx-auto h-auto w-full max-w-xl"
                    : "h-auto w-full"
                }
                priority
              />
              <figcaption className="px-5 py-4 text-sm font-bold text-muted-foreground">
                Obóz letni 2026
              </figcaption>
            </figure>
          ) : null}

          <TeamRoster
            slug={team.slug}
            fallback={roster?.players ?? []}
            coachCount={roster?.coaches.length ?? 0}
          />

          {roster && roster.coaches.length > 0 ? (
            <div className="mt-10">
              <h3 className="mb-4 text-2xl font-black text-white">
                Kadra trenerska
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {roster.coaches.map((coach) => (
                  <PersonCard key={coach.name} person={coach} variant="coach" />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="space-y-5">
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
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
              {teamContact ? (
                <div>
                  <dt className="font-black uppercase text-muted-foreground">
                    Kontakt do trenera
                  </dt>
                  <dd className="mt-2 space-y-2 text-foreground">
                    <p className="font-bold">{teamContact.coach}</p>
                    <a
                      href={telHref(teamContact.phone)}
                      className="flex items-center gap-2 text-muted-foreground transition hover:text-primary"
                    >
                      <Phone size={16} /> {teamContact.phone}
                    </a>
                    {teamContact.email ? (
                      <a
                        href={`mailto:${teamContact.email}`}
                        className="flex items-center gap-2 text-muted-foreground transition hover:text-primary"
                      >
                        <Mail size={16} /> {teamContact.email}
                      </a>
                    ) : null}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>

          <TeamNews slug={team.slug} />
        </aside>
      </section>
    </>
  );
}
