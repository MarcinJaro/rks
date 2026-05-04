"use client";

import { CalendarDays, Clock, MapPin } from "lucide-react";
import { useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { fallbackMatchCenter, type MatchItem } from "@/data/site";

type MatchCenterData = {
  nextMatch: MatchItem | null;
  upcoming: MatchItem[];
  latestResults: MatchItem[];
};

function hasMatches(data: MatchCenterData) {
  return Boolean(
    data.nextMatch || data.upcoming.length || data.latestResults.length,
  );
}

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
      <p className="text-sm font-black uppercase text-primary">
        {match.matchType === "liga" ? "Rozgrywki ligowe" : "Mecz"}
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
        Nadchodzące spotkania
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
              {match.matchType === "puchar" ? "Puchar" : "Liga"}
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}

function MatchCenterContent({ data }: { data: MatchCenterData }) {
  return (
    <section className="container-page py-12">
      <SectionHeading eyebrow="Wyniki" title="Mecze RKS Okęcie">
        Terminarz i rezultaty drużyn RKS Okęcie w jednym miejscu,
        aktualizowane razem z klubowym centrum meczowym.
      </SectionHeading>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
        <NextMatchCard match={data.nextMatch} />
        <ResultsList matches={data.latestResults} />
      </div>
      <UpcomingList matches={data.upcoming} />
    </section>
  );
}

function LiveMatchCenter() {
  const convexData = useQuery(api.matches.center, {
    upcomingLimit: 6,
    latestLimit: 6,
  });
  const publicData = usePublicMatchCenter();
  const data = useMemo(() => {
    if (convexData && hasMatches(convexData)) return convexData;
    if (publicData && hasMatches(publicData)) return publicData;
    return fallbackMatchCenter;
  }, [convexData, publicData]);

  return <MatchCenterContent data={data} />;
}

function PublicMatchCenter() {
  const publicData = usePublicMatchCenter();

  return <MatchCenterContent data={publicData || fallbackMatchCenter} />;
}

function usePublicMatchCenter() {
  const [data, setData] = useState<MatchCenterData | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/rks-matches")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: MatchCenterData | null) => {
        if (isMounted && payload) setData(payload);
      })
      .catch(() => {
        if (isMounted) setData(fallbackMatchCenter);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return data;
}

export function MatchCenter() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return <PublicMatchCenter />;
  }

  return <LiveMatchCenter />;
}
