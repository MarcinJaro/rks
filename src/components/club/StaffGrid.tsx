"use client";

import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { coaches } from "@/data/legacy";
import {
  panelOnlyTrainers,
  trainerPhotoMap,
  withTrainerPhoto,
} from "@/lib/trainerPhotos";

export function StaffGrid() {
  const trainers = useQuery(api.people.listTrainersPublic);
  const photos = trainerPhotoMap(trainers);
  // Osoby dodane tylko w panelu dochodzą na koniec listy.
  const staff = [
    ...coaches.map((coach) => ({
      ...coach,
      photo: withTrainerPhoto(coach, photos, coach.photo),
    })),
    ...panelOnlyTrainers(trainers, coaches).map((trainer) => ({
      name: trainer.name,
      team: [trainer.position, ...trainer.teams.map((team) => team.name)]
        .filter(Boolean)
        .join(" · "),
      phone: trainer.phone ?? "",
      email: trainer.email ?? "",
      photo: trainer.photoUrl,
    })),
  ];

  return (
    <section className="container-page grid gap-5 py-12 sm:grid-cols-2 lg:grid-cols-3">
      {staff.map((coach) => {
        const photo = coach.photo;
        return (
          <article key={coach.name} className="overflow-hidden rounded-[24px] border border-white/8 bg-card">
            {photo ? (
              <Image
                src={photo}
                alt={coach.name}
                width={640}
                height={800}
                sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                className="aspect-[4/5] w-full object-cover"
              />
            ) : (
              <div
                aria-hidden
                className="grid aspect-[4/5] w-full place-items-center bg-[var(--surface-raised)] text-6xl font-black text-muted-foreground/60"
              >
                {coach.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")}
              </div>
            )}
            <div className="p-6">
              <h2 className="text-2xl font-black text-white">{coach.name}</h2>
              <p className="mt-2 text-sm font-bold text-primary">{coach.team}</p>
              <div className="mt-5 space-y-2 text-sm text-muted-foreground">
                {coach.phone ? <p>tel. {coach.phone}</p> : null}
                {coach.email ? (
                  <a href={`mailto:${coach.email}`} className="block hover:text-accent">
                    {coach.email}
                  </a>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
