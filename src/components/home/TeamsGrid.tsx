import Image from "next/image";
import Link from "next/link";
import { ArrowRight, PlusCircle } from "lucide-react";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Stagger, StaggerItem } from "@/components/shared/Motion";
import { teams } from "@/data/site";

const featuredSlugs = ["seniorzy", "rocznik-2010", "rocznik-2014"];

const teamPosterOverrides: Record<string, string> = {
  seniorzy: "/images/teams/seniorzy.png",
  seniorzy2: "/images/teams/seniorzy2.png",
  "rocznik-2010": "/images/teams/rocznik-2010.png",
  "rocznik-2012": "/images/teams/rocznik-2012.png",
  "rocznik-2013": "/images/teams/rocznik-2013.png",
  "rocznik-2014": "/images/teams/rocznik-2014.png",
  "rocznik-2020": "/images/teams/rocznik-2020.png",
};

export function TeamsGrid({
  variant = "featured",
}: {
  variant?: "featured" | "all";
}) {
  const displayedTeams =
    variant === "all"
      ? teams
      : teams.filter((team) => featuredSlugs.includes(team.slug));
  const cards = displayedTeams.map((team) => ({
    ...team,
    href: `/druzyny/${team.slug}`,
  }));

  return (
    <section id="lista-druzyn" className="bg-[var(--section)] py-20">
      <div className="container-page">
        <div className="mb-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            title={variant === "all" ? "Wszystkie Drużyny" : "Nasze Drużyny"}
          />
          {variant === "featured" ? (
            <Link
              href="/druzyny#lista-druzyn"
              className="inline-flex items-center gap-2 text-base font-black text-accent hover:underline"
            >
              Wszystkie roczniki <ArrowRight size={18} />
            </Link>
          ) : (
            <Link
              href="/kontakt"
              className="inline-flex items-center gap-2 text-base font-black text-accent hover:underline"
            >
              Kontakt z klubem <ArrowRight size={18} />
            </Link>
          )}
        </div>

        <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((team) => (
            <StaggerItem key={team.href}>
              <TeamCard
                href={team.href}
                title={formatTeamTitle(team.name)}
                image={
                  teamPosterOverrides[team.slug] ||
                  `/images/teams/${team.slug}.webp`
                }
              />
            </StaggerItem>
          ))}

          <StaggerItem>
            <Link
              href="/rodzice"
              className="group grid aspect-[286/400] place-items-center rounded-[24px] border border-dashed border-[#434857] bg-[var(--surface-raised)] p-8 text-center transition hover:border-primary"
            >
              <div>
                <PlusCircle className="mx-auto text-accent transition group-hover:text-primary" size={44} />
                <h3 className="mt-8 text-2xl font-black uppercase text-white">
                  Rekrutacja
                </h3>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  Dołącz do Akademii RKS Okęcie i zacznij swoją przygodę.
                </p>
              </div>
            </Link>
          </StaggerItem>
        </Stagger>
      </div>
    </section>
  );
}

function TeamCard({
  href,
  title,
  image,
}: {
  href: string;
  title: string;
  image: string;
}) {
  return (
    <Link
      href={href}
      aria-label={title}
      className="group relative block aspect-[286/400] overflow-hidden rounded-[24px] border border-white/8 bg-[var(--team-card)] shadow-2xl shadow-black/20"
    >
      <Image
        src={image}
        alt=""
        fill
        sizes="(min-width: 1024px) 25vw, 100vw"
        className="object-cover transition duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 rounded-[24px] ring-1 ring-inset ring-white/10 transition group-hover:ring-primary/70" />
      <div className="absolute bottom-5 right-5 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 transition group-hover:opacity-100">
        <ArrowRight size={20} />
      </div>
    </Link>
  );
}

function formatTeamTitle(name: string) {
  return name
    .replace(" - Liga okręgowa", "")
    .replace(" - B Klasa", "")
    .replace(" / Weterani", "");
}
