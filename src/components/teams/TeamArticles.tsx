"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { formatDate } from "@/lib/utils";

/**
 * Artykuły przypisane do drużyny w panelu (Artykuły -> drużyna). Sekcja dla
 * zespołów seniorskich, które zamiast ogólnych postów z FB dostają własne
 * relacje. Brak artykułów = sekcja się nie renderuje.
 */
export function TeamArticles({ slug }: { slug: string }) {
  const articles = useQuery(api.articles.listPublishedByTeamSlug, {
    slug,
    limit: 4,
  });

  if (!articles || articles.length === 0) return null;

  return (
    <section className="container-page pb-12">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-primary">Drużyna</p>
          <h2 className="mt-2 text-3xl font-black text-white">Artykuły</h2>
        </div>
        <Link
          href="/aktualnosci"
          className="inline-flex items-center gap-2 text-sm font-black text-accent hover:underline"
        >
          Wszystkie aktualności <ArrowRight size={16} />
        </Link>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {articles.map((article) => (
          <Link
            key={article._id}
            href={`/aktualnosci/${article.slug}`}
            className="group flex flex-col overflow-hidden rounded-[20px] border border-white/8 bg-card transition hover:border-primary"
          >
            {article.imageUrl ? (
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image
                  src={article.imageUrl}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
            ) : null}
            <div className="flex flex-1 flex-col p-5">
              <time
                dateTime={new Date(article.publishedAt).toISOString()}
                className="text-xs font-black uppercase text-muted-foreground"
              >
                {formatDate(article.publishedAt)}
              </time>
              <h3 className="mt-2 text-lg font-black leading-snug text-white transition group-hover:text-primary">
                {article.title}
              </h3>
              {article.excerpt ? (
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                  {article.excerpt}
                </p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
