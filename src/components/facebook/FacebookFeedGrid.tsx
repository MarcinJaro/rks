"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { FeedItem, type FeedItemProps } from "@/components/facebook/FeedItem";
import { Stagger, StaggerItem } from "@/components/shared/Motion";
import { fallbackPosts } from "@/data/site";

type FeedSource = "all" | "facebook" | "cms";

type ConvexFeedItem = {
  _id?: string;
  source: "facebook" | "cms";
  title?: string;
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
}: {
  limit?: number;
  source?: FeedSource;
  className?: string;
}) {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return <StaticFeedGrid limit={limit} className={className} />;
  }

  return <LiveFeedGrid limit={limit} source={source} className={className} />;
}

function LiveFeedGrid({
  limit,
  source,
  className,
}: {
  limit: number;
  source: FeedSource;
  className: string;
}) {
  const items = useQuery(api.feed.getUnifiedFeed, { limit, source });
  const posts =
    items && items.length > 0
      ? items.map((item: ConvexFeedItem, index: number) =>
          normalizeFeedItem(item, index),
        )
      : fallbackPosts.slice(0, limit);

  return <FeedGrid posts={posts} className={className} />;
}

function StaticFeedGrid({
  limit,
  className,
}: {
  limit: number;
  className: string;
}) {
  return <FeedGrid posts={fallbackPosts.slice(0, limit)} className={className} />;
}

function FeedGrid({
  posts,
  className,
}: {
  posts: FeedItemProps[];
  className: string;
}) {
  return (
    <Stagger className={className}>
      {posts.map((post) => (
        <StaggerItem key={`${post.source}-${post.url}-${post.publishedAt}`}>
          <FeedItem {...post} />
        </StaggerItem>
      ))}
    </Stagger>
  );
}

function normalizeFeedItem(
  item: ConvexFeedItem,
  index: number,
): FeedItemProps {
  const fallback = fallbackPosts[index % fallbackPosts.length];
  const content = item.content?.trim() || fallback.content;
  const title = item.title?.trim() || buildTitle(content);
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
    engagement: item.engagement,
  };
}

function buildTitle(content: string) {
  const firstLine = content.split("\n").find(Boolean);
  if (!firstLine) return "RKS Okęcie Warszawa";
  return firstLine.length > 72 ? `${firstLine.slice(0, 69)}...` : firstLine;
}
