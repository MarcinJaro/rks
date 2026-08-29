"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { FeedItem } from "@/components/facebook/FeedItem";
import {
  normalizeFeedItem,
  type ConvexFeedItem,
} from "@/components/facebook/FacebookFeedGrid";

/**
 * Aktualności przypisane do drużyny w panelu (Posty FB -> drużyna).
 * Brak przypisanych postów = sekcja w ogóle się nie renderuje - lepszy brak
 * bloku niż seniorskie wpisy na stronie rocznika dziecięcego.
 */
export function TeamNews({ slug }: { slug: string }) {
  const posts = useQuery(api.feed.getTeamFeed, { teamSlug: slug, limit: 2 });

  if (!posts || posts.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <h2 className="text-2xl font-black text-navy">Aktualności drużyny</h2>
      <div className="mt-5 grid gap-5">
        {posts.map((post, index) => (
          <FeedItem
            key={post._id}
            {...normalizeFeedItem(post as ConvexFeedItem, index)}
          />
        ))}
      </div>
    </div>
  );
}
