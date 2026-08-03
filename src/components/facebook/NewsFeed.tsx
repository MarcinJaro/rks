"use client";

import { useState } from "react";
import { FacebookFeedGrid } from "@/components/facebook/FacebookFeedGrid";

const FILTERS: { label: string; category?: string }[] = [
  { label: "Wszystko" },
  { label: "Mecze", category: "mecz" },
  { label: "Treningi", category: "trening" },
  { label: "Turnieje", category: "turniej" },
  { label: "Ogłoszenia", category: "ogłoszenie" },
  { label: "Wydarzenia", category: "wydarzenie" },
];

export function NewsFeed() {
  const [category, setCategory] = useState<string | undefined>(undefined);

  return (
    <>
      <div className="mb-8 flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const active = filter.category === category;
          return (
            <button
              key={filter.label}
              onClick={() => setCategory(filter.category)}
              className={
                active
                  ? "rounded-md border border-accent bg-accent px-4 py-2 text-sm font-bold text-[#002e5e]"
                  : "rounded-md border border-border bg-card px-4 py-2 text-sm font-bold text-muted-foreground hover:border-primary hover:text-primary"
              }
            >
              {filter.label}
            </button>
          );
        })}
      </div>
      <FacebookFeedGrid
        limit={12}
        source="all"
        className="grid gap-5 md:grid-cols-3"
        featured={!category}
        category={category}
      />
    </>
  );
}
