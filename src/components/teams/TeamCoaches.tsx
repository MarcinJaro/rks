"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PersonCard } from "@/components/teams/PersonCard";
import { coaches as allCoaches } from "@/data/legacy";
import type { RosterPerson } from "@/data/roster";
import { mergeTeamCoaches } from "@/lib/trainerPhotos";

/** Statyczny sztab drużyny uzupełniony o trenerów przypisanych w panelu. */
export function useTeamCoaches(slug: string, coaches: RosterPerson[]) {
  const trainers = useQuery(api.people.listTrainersPublic);
  return mergeTeamCoaches(slug, coaches, allCoaches, trainers);
}

export function TeamCoaches({
  slug,
  coaches,
}: {
  slug: string;
  coaches: RosterPerson[];
}) {
  const merged = useTeamCoaches(slug, coaches);
  if (merged.length === 0) return null;

  return (
    <div className="mt-10">
      <h3 className="mb-4 text-2xl font-black text-white">Kadra trenerska</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {merged.map((coach) => (
          <PersonCard key={coach.name} person={coach} variant="coach" />
        ))}
      </div>
    </div>
  );
}
