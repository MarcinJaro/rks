"use client";

import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { boardMembers } from "@/data/legacy";

type BoardMember = {
  name: string;
  position: string | null;
  email: string | null;
  photoUrl: string | null;
};

// Plik zostaje zapasem na czas ładowania i dla pustej tabeli w panelu.
const fallback: BoardMember[] = boardMembers.map(([name, position, email]) => ({
  name,
  position,
  email: email || null,
  photoUrl: null,
}));

export function BoardGrid() {
  const managed = useQuery(api.people.listPublic, { role: "zarząd" });
  const members = managed && managed.length > 0 ? managed : fallback;

  return (
    <section className="container-page grid gap-4 py-12 md:grid-cols-2 lg:grid-cols-3">
      {members.map((member) => (
        <article key={member.name} className="rounded-[20px] border border-white/8 bg-card p-6">
          {member.photoUrl ? (
            <Image
              src={member.photoUrl}
              alt={member.name}
              width={112}
              height={112}
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div className="grid h-14 w-14 place-items-center rounded-full bg-accent text-lg font-black text-[#002e5e]">
              {member.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
            </div>
          )}
          <h2 className="mt-6 text-2xl font-black text-white">{member.name}</h2>
          {member.position ? (
            <p className="mt-2 text-sm font-bold text-primary">{member.position}</p>
          ) : null}
          {member.email ? (
            <a href={`mailto:${member.email}`} className="mt-5 block text-sm text-muted-foreground hover:text-accent">
              {member.email}
            </a>
          ) : null}
        </article>
      ))}
    </section>
  );
}
