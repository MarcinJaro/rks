"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Stagger, StaggerItem } from "@/components/shared/Motion";
import { clubLegends } from "@/data/legacy";

export function LegendsList() {
  const managed = useQuery(api.people.listPublic, { role: "legenda" });
  const names =
    managed && managed.length > 0
      ? managed.map((person) => person.name)
      : clubLegends;

  return (
    <Stagger className="mt-6 grid gap-3 sm:grid-cols-2">
      {names.map((name) => (
        <StaggerItem key={name}>
          <div className="rounded-md border border-white/8 bg-card px-4 py-3 text-sm font-black text-white">
            {name}
          </div>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
