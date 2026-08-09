"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { FeedItem, type FeedItemProps } from "@/components/facebook/FeedItem";
import { Stagger, StaggerItem } from "@/components/shared/Motion";
import { fallbackPosts } from "@/data/site";
import { buildFeedTitle } from "@/lib/feedText";

type FeedSource = "all" | "facebook" | "cms";

export type ConvexFeedItem = {
  _id?: string;
  source: "facebook" | "cms";
  title?: string;
  slug?: string | null;
  content?: string;
  imageUrl?: string | null;
  imageUrls?: Array<string | null>;
  postType?: string;
  publishedAt?: number;
  engagement: FeedItemProps["engagement"];
  url: string;
};

export function FacebookFeedGrid({
  limit = 3,
  source = "all",
  className = "grid gap-8 md:grid-cols-3",
  featured = false,
  category,
}: {
  limit?: number;
  source?: FeedSource;
  className?: string;
  featured?: boolean;
  category?: string;
}) {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return (
      <StaticFeedGrid limit={limit} className={className} featured={featured} />
    );
  }

  return (
    <LiveFeedGrid
      limit={limit}
      source={source}
      className={className}
      featured={featured}
      category={category}
    />
  );
}

function LiveFeedGrid({
  limit,
  source,
  className,
  featured,
  category,
}: {
  limit: number;
  source: FeedSource;
  className: string;
  featured: boolean;
  category?: string;
}) {
  const items = useQuery(api.feed.getUnifiedFeed, { limit, source, category });

  if (items && items.length === 0 && category) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-muted-foreground">
        Brak wpisów w tej kategorii.
      </div>
    );
  }

  const posts =
    items && items.length > 0
      ? items.map((item: ConvexFeedItem, index: number) =>
          normalizeFeedItem(item, index),
        )
      : fallbackPosts.slice(0, limit);

  return <FeedGrid posts={posts} className={className} featured={featured} />;
}

function StaticFeedGrid({
  limit,
  className,
  featured,
}: {
  limit: number;
  className: string;
  featured: boolean;
}) {
  return (
    <FeedGrid
      posts={fallbackPosts.slice(0, limit)}
      className={className}
      featured={featured}
    />
  );
}

export function FeedGrid({
  posts,
  className,
  featured,
}: {
  posts: FeedItemProps[];
  className: string;
  featured: boolean;
}) {
  const [first, ...rest] = posts;
  // Stagger animates whileInView with `once: true`; when the post list changes
  // (live data replacing fallbacks, or a filter click) freshly mounted items
  // would stay in the hidden state. Remount the container per data set.
  const dataKey = posts.map((post) => post.url).join("|");

  if (!featured || !first) {
    return (
      <Stagger key={dataKey} className={className}>
        {posts.map((post) => (
          <StaggerItem key={`${post.source}-${post.url}-${post.publishedAt}`}>
            <FeedItem {...post} />
          </StaggerItem>
        ))}
      </Stagger>
    );
  }

  return (
    <div className="space-y-8">
      <FeedItem {...first} variant="featured" />
      <Stagger key={dataKey} className={className}>
        {rest.map((post) => (
          <StaggerItem key={`${post.source}-${post.url}-${post.publishedAt}`}>
            <FeedItem {...post} />
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}

export function normalizeFeedItem(
  item: ConvexFeedItem,
  index: number,
): FeedItemProps {
  const fallback = fallbackPosts[index % fallbackPosts.length];
  const content = item.content?.trim() || fallback.content;
  const title = item.title?.trim() || buildFeedTitle(content);
  const imageUrl =
    item.imageUrl || item.imageUrls?.find((url): url is string => Boolean(url));

  return {
    title,
    content,
    imageUrl,
    mediaType: item.postType === "video" ? "video" : "article",
    publishedAt: item.publishedAt || Date.now(),
    source: item.source,
    url: item.url,
    slug: item.slug,
    engagement: item.engagement,
  };
}
