"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  FacebookFeedGrid,
  FeedGrid,
  normalizeFeedItem,
  type ConvexFeedItem,
} from "@/components/facebook/FacebookFeedGrid";
import { fallbackPosts } from "@/data/site";

const FILTERS: { label: string; category?: string }[] = [
  { label: "Wszystko" },
  { label: "Mecze", category: "mecz" },
  { label: "Treningi", category: "trening" },
  { label: "Turnieje", category: "turniej" },
  { label: "Ogłoszenia", category: "ogłoszenie" },
  { label: "Wydarzenia", category: "wydarzenie" },
];

const PAGE_SIZE = 12;
const GRID_CLASS = "grid gap-5 md:grid-cols-3";

export function NewsFeed() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return (
      <FacebookFeedGrid
        limit={PAGE_SIZE}
        source="all"
        className={GRID_CLASS}
        featured
      />
    );
  }

  return <LiveNewsFeed />;
}

function LiveNewsFeed() {
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [month, setMonth] = useState<string | null>(null);
  // Cursors of the extra pages loaded via "Załaduj więcej"; page one always
  // starts at cursor null.
  const [extraCursors, setExtraCursors] = useState<number[]>([]);

  const archive = useQuery(api.feed.getNewsArchiveRange, {});
  const months = buildMonths(archive?.oldestPublishedAt ?? null);

  const bounds = month ? monthBounds(month) : null;
  const cursors: (number | null)[] = [null, ...extraCursors];
  const featuredLayout = !category && !month;

  const selectCategory = (next?: string) => {
    setCategory(next);
    setExtraCursors([]);
  };
  const selectMonth = (next: string | null) => {
    setMonth(next);
    setExtraCursors([]);
  };

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center gap-2">
        {FILTERS.map((filter) => {
          const active = filter.category === category;
          return (
            <button
              key={filter.label}
              onClick={() => selectCategory(filter.category)}
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
        {months.length > 0 ? (
          <label className="ml-auto flex items-center gap-2 text-sm font-bold text-muted-foreground">
            <span className="uppercase text-xs font-black">Archiwum</span>
            <select
              value={month ?? ""}
              onChange={(event) => selectMonth(event.target.value || null)}
              className="rounded-md border border-border bg-card px-3 py-2 text-sm font-bold text-muted-foreground hover:border-primary hover:text-primary"
            >
              <option value="">Wszystkie wpisy</option>
              {months.map((entry) => (
                <option key={entry.key} value={entry.key}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <div className="space-y-8">
        {cursors.map((cursor, index) => (
          <NewsFeedChunk
            key={`${category ?? "all"}|${month ?? "all"}|${cursor ?? "start"}`}
            cursor={cursor}
            category={category}
            monthStart={bounds?.start}
            monthEnd={bounds?.end}
            featured={featuredLayout && index === 0}
            isFirst={index === 0}
            isLast={index === cursors.length - 1}
            hasFilters={Boolean(category || month)}
            onLoadMore={(next) =>
              setExtraCursors((current) => [...current, next])
            }
          />
        ))}
      </div>
    </>
  );
}

function NewsFeedChunk({
  cursor,
  category,
  monthStart,
  monthEnd,
  featured,
  isFirst,
  isLast,
  hasFilters,
  onLoadMore,
}: {
  cursor: number | null;
  category?: string;
  monthStart?: number;
  monthEnd?: number;
  featured: boolean;
  isFirst: boolean;
  isLast: boolean;
  hasFilters: boolean;
  onLoadMore: (cursor: number) => void;
}) {
  // The featured layout promotes the first item out of the 3-column grid, so
  // fetch one extra to keep the last row complete.
  const result = useQuery(api.feed.getNewsFeedPage, {
    numItems: featured ? PAGE_SIZE + 1 : PAGE_SIZE,
    cursor,
    category,
    monthStart,
    monthEnd,
  });

  if (result === undefined) {
    return <FeedSkeleton count={isFirst ? 6 : 3} />;
  }

  if (result.page.length === 0) {
    if (!isFirst) return null;
    if (hasFilters) {
      return (
        <div className="rounded-lg border border-border bg-card p-8 text-muted-foreground">
          Brak wpisów spełniających wybrane kryteria.
        </div>
      );
    }
    return (
      <FeedGrid
        posts={fallbackPosts.slice(0, PAGE_SIZE)}
        className={GRID_CLASS}
        featured={featured}
      />
    );
  }

  const posts = result.page.map((item, index) =>
    normalizeFeedItem(item as ConvexFeedItem, index),
  );
  const nextCursor = result.continueCursor;

  return (
    <>
      <FeedGrid posts={posts} className={GRID_CLASS} featured={featured} />
      {isLast && !result.isDone && nextCursor !== null ? (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => onLoadMore(nextCursor)}
            className="rounded-md border border-accent bg-accent px-8 py-3 text-sm font-black uppercase text-[#002e5e] transition hover:brightness-110"
          >
            Załaduj więcej
          </button>
        </div>
      ) : null}
    </>
  );
}

function FeedSkeleton({ count }: { count: number }) {
  return (
    <div className={GRID_CLASS}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="h-80 animate-pulse rounded-lg border border-white/8 bg-card"
        />
      ))}
    </div>
  );
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthBounds(key: string) {
  const [year, month] = key.split("-").map(Number);
  return {
    start: new Date(year, month - 1, 1).getTime(),
    end: new Date(year, month, 1).getTime(),
  };
}

function buildMonths(oldest: number | null) {
  if (!oldest) return [];
  const formatter = new Intl.DateTimeFormat("pl-PL", {
    month: "long",
    year: "numeric",
  });
  const months: { key: string; label: string }[] = [];
  const current = new Date();
  current.setDate(1);
  current.setHours(0, 0, 0, 0);
  const stop = new Date(oldest);
  stop.setDate(1);
  stop.setHours(0, 0, 0, 0);

  while (current.getTime() >= stop.getTime() && months.length < 120) {
    const label = formatter.format(current);
    months.push({
      key: monthKey(current),
      label: label.charAt(0).toUpperCase() + label.slice(1),
    });
    current.setMonth(current.getMonth() - 1);
  }

  return months;
}
