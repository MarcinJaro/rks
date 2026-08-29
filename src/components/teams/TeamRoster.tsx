"use client";

import { useQuery } from "convex/react";
import { Camera, Shield, UsersRound } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { PersonCard, type CardPerson } from "@/components/teams/PersonCard";

/**
 * Kadra drużyny. Panel administracyjny jest źródłem nadrzędnym: jeśli klub
 * wpisał tam choć jednego zawodnika, statyczna lista zapasowa (dorosłe
 * drużyny przeniesione ze starego serwisu) przestaje być pokazywana.
 */
export function TeamRoster({
  slug,
  fallback,
  coachCount,
}: {
  slug: string;
  fallback: CardPerson[];
  coachCount: number;
}) {
  const managed = useQuery(api.players.listByTeamSlug, { slug });
  const players: CardPerson[] =
    managed && managed.length > 0 ? managed : fallback;
  const photoCount = players.filter((player) => player.photoUrl).length;

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-primary">Kadra</p>
          <h2 className="mt-2 text-3xl font-black text-white">
            Zawodnicy i sztab
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {players.length > 0 ? (
            <>
              <RosterMetric
                icon={<UsersRound size={18} />}
                label="zawodników"
                value={players.length}
              />
              <RosterMetric
                icon={<Camera size={18} />}
                label="zdjęć"
                value={photoCount}
              />
            </>
          ) : null}
          {coachCount > 0 ? (
            <RosterMetric
              icon={<Shield size={18} />}
              label="sztab"
              value={coachCount}
            />
          ) : null}
        </div>
      </div>

      {players.length > 0 ? (
        <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(145px,1fr))]">
          {players.map((player, index) => (
            <PersonCard
              key={`${player.number ?? "bez-numeru"}-${player.name}-${index}`}
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
            Skład tego rocznika uzupełniamy razem z trenerem prowadzącym.
            W sprawie zapisów i informacji o drużynie zapraszamy do kontaktu
            telefonicznego.
          </p>
        </div>
      )}
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
