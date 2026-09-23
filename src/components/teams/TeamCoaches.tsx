"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PersonCard, type CardPerson } from "@/components/teams/PersonCard";
import { trainerPhotoMap, withTrainerPhoto } from "@/lib/trainerPhotos";

export function TeamCoaches({ coaches }: { coaches: CardPerson[] }) {
  const photos = trainerPhotoMap(useQuery(api.people.listTrainerPhotos));

  return (
    <div className="mt-10">
      <h3 className="mb-4 text-2xl font-black text-white">Kadra trenerska</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {coaches.map((coach) => (
          <PersonCard
            key={coach.name}
            person={{
              ...coach,
              photoUrl: withTrainerPhoto(coach, photos, coach.photoUrl),
            }}
            variant="coach"
          />
        ))}
      </div>
    </div>
  );
}
