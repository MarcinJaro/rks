import { notFound } from "next/navigation";
import Image from "next/image";
import { Camera, Mail, Phone, Shield, UserRound, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { fallbackPosts, teams } from "@/data/site";
import { FeedItem } from "@/components/facebook/FeedItem";
import { getTeamRoster, type RosterPerson } from "@/data/roster";
import { teamContacts } from "@/data/legacy";

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
  const photoCount =
    roster?.players.filter((player) => Boolean(player.photoUrl)).length ?? 0;

  return (
    <>
      <PageHeader
        title={team.name}
        description="Informacje o drużynie, aktualności, rozgrywki oraz kontakt organizacyjny dla zawodników i rodziców."
      />
      <section className="container-page grid gap-8 py-12 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase text-primary">
                Kadra
              </p>
              <h2 className="mt-2 text-3xl font-black text-white">
                Zawodnicy i sztab
              </h2>
            </div>
            {roster ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <RosterMetric
                  icon={<UsersRound size={18} />}
                  label="zawodników"
                  value={roster.players.length}
                />
                <RosterMetric
                  icon={<Camera size={18} />}
                  label="zdjęć"
                  value={photoCount}
                />
                <RosterMetric
                  icon={<Shield size={18} />}
                  label="sztab"
                  value={roster.coaches.length}
                />
              </div>
            ) : null}
          </div>

          {roster && roster.players.length > 0 ? (
            <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(145px,1fr))]">
              {roster.players.map((player) => (
                <PersonCard
                  key={`${player.number ?? "bez-numeru"}-${player.name}`}
                  person={player}
                  variant="player"
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-card/60 p-8">
              <p className="text-xl font-black text-white">
                Kadra w przygotowaniu
              </p>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                Po uzupełnieniu aktualnych zgód i zdjęć ten rocznik dostanie
                taką samą prezentację zawodników jak starsze drużyny.
              </p>
            </div>
          )}

          {roster && roster.coaches.length > 0 ? (
            <div className="mt-10">
              <h3 className="mb-4 text-2xl font-black text-white">
                Kadra trenerska
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {roster.coaches.map((coach) => (
                  <PersonCard
                    key={coach.name}
                    person={coach}
                    variant="coach"
                  />
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
                      href={getPrimaryPhoneHref(teamContact.phone)}
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

          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h2 className="text-2xl font-black text-navy">
              Aktualności drużyny
            </h2>
            <div className="mt-5 grid gap-5">
              {fallbackPosts.slice(0, 2).map((post) => (
                <FeedItem key={post.title} {...post} />
              ))}
            </div>
          </div>
        </aside>
      </section>
    </>
  );
}

function RosterMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-[96px] rounded-lg border border-border bg-card px-3 py-2">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="text-lg font-black leading-none">{value}</span>
      </div>
      <p className="mt-1 text-xs font-bold uppercase text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function PersonCard({
  person,
  variant,
}: {
  person: RosterPerson;
  variant: "player" | "coach";
}) {
  const initials = person.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="relative aspect-[4/5] bg-muted">
        {person.photoUrl ? (
          <Image
            src={person.photoUrl}
            alt={person.name}
            fill
            sizes="(min-width: 1024px) 170px, (min-width: 640px) 25vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_center,#1f2d48_0%,#0b1222_65%)]">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-background/60 text-2xl font-black text-primary">
              {initials || <UserRound size={30} />}
            </div>
          </div>
        )}
        {variant === "player" && person.number ? (
          <div className="absolute left-3 top-3 rounded-md bg-primary px-2 py-1 text-sm font-black text-primary-foreground">
            {person.number}
          </div>
        ) : null}
      </div>
      <div className="p-4">
        <h3 className="text-base font-black leading-tight text-white">
          {person.name}
        </h3>
        <p className="mt-2 text-xs font-bold uppercase text-muted-foreground">
          {variant === "coach" ? "Sztab szkoleniowy" : "RKS Okęcie"}
        </p>
      </div>
    </article>
  );
}

function getPrimaryPhoneHref(phone: string) {
  const primaryPhone = phone.split("/")[0] ?? phone;

  return `tel:${primaryPhone.replace(/\D/g, "")}`;
}
