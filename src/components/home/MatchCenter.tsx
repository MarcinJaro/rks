"use client";

import { CalendarDays, Clock, MapPin } from "lucide-react";
import { useQuery } from "convex/react";
import { useMemo, useState, type ReactNode } from "react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { StandingsTable } from "@/components/home/StandingsTable";
import type { MatchItem } from "@/data/site";

type TeamTab = {
  _id: Id<"teams">;
  name: string;
  slug: string;
};

const ALL_TEAMS = "all";

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function EmptyMatchState() {
  return (
    <div className="rounded-[18px] border border-dashed border-white/15 bg-muted p-6">
      <p className="text-sm font-black uppercase text-primary">
        Oczekujemy na terminarz
      </p>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        Wyniki i najbliższe spotkania pojawią się tutaj po publikacji
        terminarza rozgrywek.
      </p>
    </div>
  );
}

function NextMatchCard({ match }: { match: MatchItem | null }) {
  if (!match) return <EmptyMatchState />;

  return (
    <article className="rounded-[24px] border border-white/8 bg-card p-6 shadow-sm shadow-black/20">
      <p className="flex flex-wrap items-center gap-2 text-sm font-black uppercase text-primary">
        <span>{match.teamName || "RKS Okęcie"}</span>
        <span className="text-muted-foreground">/</span>
        <span>{match.matchType === "liga" ? "Rozgrywki ligowe" : "Mecz"}</span>
      </p>
      <h3 className="mt-4 text-3xl font-black tracking-normal text-white">
        {match.homeTeam} - {match.awayTeam}
      </h3>
      <div className="mt-6 grid gap-3 text-sm font-bold text-muted-foreground sm:grid-cols-2">
        <p className="flex items-center gap-2">
          <CalendarDays size={18} /> {formatDate(match.date)}
        </p>
        {match.venue ? (
          <p className="flex items-center gap-2">
            <MapPin size={18} /> {match.venue}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function ResultsList({ matches }: { matches: MatchItem[] }) {
  if (!matches.length) {
    return (
      <div className="rounded-[24px] bg-secondary p-6 text-white">
        <p className="text-sm font-black uppercase text-primary-foreground">
          Ostatnie wyniki
        </p>
        <p className="mt-4 text-3xl font-black">Brak wyników</p>
        <p className="mt-3 text-sm leading-6 text-white/75">
          Po rozegraniu spotkań rezultaty będą wyświetlane automatycznie.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] bg-secondary p-6 text-white">
      <p className="text-sm font-black uppercase text-primary-foreground">
        Ostatnie wyniki
      </p>
      <div className="mt-5 space-y-3">
        {matches.slice(0, 3).map((match) => (
          <article
            key={match._id || `${match.homeTeam}-${match.awayTeam}-${match.date}`}
            className="rounded-[14px] bg-white/10 p-4"
          >
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm font-black">
              <span>{match.homeTeam}</span>
              <span className="rounded-md bg-primary px-3 py-1 text-lg text-primary-foreground">
                {match.result || "-:-"}
              </span>
            <span className="text-right">{match.awayTeam}</span>
          </div>
          {match.teamName ? (
            <p className="mt-3 text-xs font-black uppercase text-white/65">
              {match.teamName}
            </p>
          ) : null}
          {match.veoUrl || match.youtubeUrl ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {match.veoUrl ? (
                <a
                  href={match.veoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md bg-white/15 px-3 py-1 text-xs font-black uppercase text-white transition hover:bg-primary hover:text-primary-foreground"
                >
                  ▶ Nagranie VEO
                </a>
              ) : null}
              {match.youtubeUrl ? (
                <a
                  href={match.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md bg-white/15 px-3 py-1 text-xs font-black uppercase text-white transition hover:bg-primary hover:text-primary-foreground"
                >
                  ▶ YouTube
                </a>
              ) : null}
            </div>
          ) : null}
        </article>
      ))}
      </div>
    </div>
  );
}

function UpcomingList({ matches }: { matches: MatchItem[] }) {
  if (!matches.length) return null;

  return (
    <div className="mt-5 rounded-[24px] border border-white/8 bg-card p-6">
      <p className="text-sm font-black uppercase text-primary">
        Terminarz
      </p>
      <div className="mt-5 divide-y divide-white/10">
        {matches.slice(0, 6).map((match) => (
          <article
            key={match._id || `${match.homeTeam}-${match.awayTeam}-${match.date}`}
            className="grid gap-3 py-4 md:grid-cols-[1fr_auto] md:items-center"
          >
            <div>
              <p className="text-base font-black text-white">
                {match.homeTeam} - {match.awayTeam}
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm font-bold text-muted-foreground">
                <CalendarDays size={16} /> {formatDate(match.date)}
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-xs font-black uppercase text-white">
              <Clock size={14} />
              {match.teamName || (match.matchType === "puchar" ? "Puchar" : "Liga")}
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}

function TeamSelector({
  teams,
  selectedTeam,
  onChange,
}: {
  teams: TeamTab[];
  selectedTeam: string;
  onChange: (teamSlug: string) => void;
}) {
  if (!teams.length) return null;

  const buttonClass = (isActive: boolean) =>
    `rounded-md border px-4 py-2 text-sm font-black uppercase transition ${
      isActive
        ? "border-primary bg-primary text-primary-foreground"
        : "border-white/10 bg-white/5 text-white hover:border-primary"
    }`;

  return (
    <div className="mt-8 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange(ALL_TEAMS)}
        className={buttonClass(selectedTeam === ALL_TEAMS)}
      >
        Wszystkie
      </button>
      {teams.map((team) => (
        <button
          key={team.slug}
          type="button"
          onClick={() => onChange(team.slug)}
          className={buttonClass(selectedTeam === team.slug)}
        >
          {team.name}
        </button>
      ))}
    </div>
  );
}

function MatchCenterSkeleton() {
  return (
    <div className="mt-8 grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
      <div className="h-64 animate-pulse rounded-[24px] border border-white/8 bg-card" />
      <div className="h-64 animate-pulse rounded-[24px] bg-secondary/60" />
    </div>
  );
}

function MatchCenterShell({ children }: { children: ReactNode }) {
  return (
    <section className="container-page py-12">
      <SectionHeading eyebrow="Wyniki" title="Mecze RKS Okęcie">
        Terminarz i rezultaty drużyn RKS Okęcie w jednym miejscu,
        aktualizowane razem z klubowym centrum meczowym.
      </SectionHeading>
      {children}
    </section>
  );
}

function LiveMatchCenter() {
  const [selectedTeam, setSelectedTeam] = useState(ALL_TEAMS);
  const teams = useQuery(api.teams.matchCenterList, {});
  const teamSlug = selectedTeam === ALL_TEAMS ? undefined : selectedTeam;
  const data = useQuery(api.matches.center, {
    upcomingLimit: 6,
    latestLimit: 6,
    teamSlug,
  });

  const teamNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const team of teams || []) names.set(team._id, team.name);
    return names;
  }, [teams]);

  const view = useMemo(() => {
    if (!data) return null;
    const decorate = (match: Doc<"matches">) => ({
      ...match,
      teamName: match.teamId ? teamNames.get(match.teamId) : undefined,
    });

    return {
      nextMatch: data.nextMatch ? decorate(data.nextMatch) : null,
      upcoming: data.upcoming.map(decorate),
      latestResults: data.latestResults.map(decorate),
    };
  }, [data, teamNames]);

  const activeTeam = (teams || []).find((team) => team.slug === selectedTeam);

  return (
    <MatchCenterShell>
      <TeamSelector
        teams={teams || []}
        selectedTeam={selectedTeam}
        onChange={setSelectedTeam}
      />

      {view === null ? (
        <MatchCenterSkeleton />
      ) : (
        <>
          <div className="mt-8 grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
            <NextMatchCard match={view.nextMatch} />
            <ResultsList matches={view.latestResults} />
          </div>
          <UpcomingList matches={view.upcoming} />
          {activeTeam ? <StandingsTable teamId={activeTeam._id} /> : null}
        </>
      )}
    </MatchCenterShell>
  );
}

export function MatchCenter() {
  // Bez adresu Convex nie ma providera w drzewie, więc hooki zapytań nie mogą
  // się wykonać — pokazujemy sam pusty stan zamiast wywracać stronę.
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return (
      <MatchCenterShell>
        <div className="mt-8">
          <EmptyMatchState />
        </div>
      </MatchCenterShell>
    );
  }

  return <LiveMatchCenter />;
}
