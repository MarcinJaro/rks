"use client";

import { ArticleBody } from "@/components/articles/ArticleBody";
import { ArticleGallery } from "@/components/articles/ArticleGallery";
import { ArticleVideo } from "@/components/articles/ArticleVideo";
import { Lightbox } from "@/components/shared/Lightbox";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Expand, PlayCircle } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { formatDate } from "@/lib/utils";
import Image from "next/image";
import { buildFeedTitle, removeEmoji } from "@/lib/feedText";
import { parsePostBody } from "@/lib/postBody";
import { getVideoEmbed } from "@/lib/videoEmbed";

export function PostDetail({ slug }: { slug: string }) {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return <DetailShell>Wpis niedostępny w trybie offline.</DetailShell>;
  }
  return <LiveDetail slug={slug} />;
}

function LiveDetail({ slug }: { slug: string }) {
  const post = useQuery(api.feed.getPostBySlug, { slug });
  const [heroZoomed, setHeroZoomed] = useState(false);

  if (post === undefined) {
    return <DetailShell>Ładowanie wpisu…</DetailShell>;
  }
  if (post === null) {
    return (
      <DetailShell>
        Nie znaleziono takiego wpisu.{" "}
        <Link href="/aktualnosci" className="font-black text-accent hover:underline">
          Wróć do aktualności
        </Link>
        .
      </DetailShell>
    );
  }

  const title =
    post.source === "cms" && "title" in post && post.title
      ? post.title
      : buildFeedTitle(post.content || "");
  const heroUrl = post.imageUrl || post.imageUrls?.find(Boolean) || null;
  const gallery = (post.imageUrls || []).filter(
    (url): url is string => Boolean(url) && (post.source === "cms" || url !== heroUrl),
  );
  const isLocal = (url: string) => url.startsWith("http://127.0.0.1");
  // videoEmbeddable === false: FB odmawia osadzenia (prawa autorskie) —
  // pokazujemy miniaturę z linkiem do FB zamiast ramki "Niedostępna".
  const embed =
    post.postType === "video" && post.videoUrl && post.videoEmbeddable !== false
      ? getVideoEmbed(post.videoUrl)
      : null;

  return (
    <article className="container-page py-12">
      <Link
        href="/aktualnosci"
        className="mb-8 inline-flex items-center gap-2 text-sm font-black text-accent hover:underline"
      >
        <ArrowLeft size={16} /> Wszystkie aktualności
      </Link>

      <header className="mx-auto max-w-3xl">
        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs font-black uppercase text-muted-foreground">
          <span className="rounded-md bg-accent px-2.5 py-1 text-[#002e5e]">
            {post.postType === "video" ? "Video" : "Aktualność"}
          </span>
          <time dateTime={new Date(post.publishedAt).toISOString()}>
            {formatDate(post.publishedAt)}
          </time>
        </div>
        <h1 className="text-3xl font-black leading-tight text-white md:text-5xl">
          {title}
        </h1>
        <div className="mt-5 h-1.5 w-24 bg-primary" aria-hidden />
      </header>

      {embed ? (
        <div
          className={`relative mx-auto mt-8 overflow-hidden rounded-lg border border-white/8 bg-black ${
            embed.portrait ? "aspect-[9/16] max-w-md" : "aspect-video max-w-4xl"
          }`}
        >
          <iframe
            src={embed.src}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      ) : heroUrl ? (
        // Na stronie wpisu liczy się CAŁA grafika (składy, plakaty) - żadnego
        // kadrowania: obraz w naturalnych proporcjach, ograniczony wysokością.
        <div className="group relative mx-auto mt-8 w-fit max-w-4xl">
          <Image
            src={heroUrl}
            alt={title}
            width={1280}
            height={1280}
            unoptimized={isLocal(heroUrl)}
            sizes="(min-width: 1024px) 896px, 100vw"
            // min-width w vw, nie w %: rodzic ma w-fit, więc procent byłby
            // cyrkularny i przeglądarka by go zignorowała. UWAGA: min-width
            // wygrywa z max-width, stąd ograniczenie viewportem, nie 100%.
            style={{ minWidth: "min(28rem, calc(100vw - 3rem))" }}
            className="mx-auto h-auto max-h-[38rem] w-auto max-w-full rounded-lg border border-white/8"
            priority
          />
          {post.postType === "video" && post.videoUrl ? (
            <a
              href={post.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 grid place-items-center rounded-lg bg-black/30"
            >
              <span className="grid h-20 w-20 place-items-center rounded-full bg-accent text-[#002e5e] shadow-2xl shadow-black/30">
                <PlayCircle size={44} />
              </span>
            </a>
          ) : (
            <button
              type="button"
              onClick={() => setHeroZoomed(true)}
              aria-label="Powiększ zdjęcie"
              className="absolute inset-0 cursor-zoom-in rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              <span className="absolute bottom-3 right-3 grid size-10 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                <Expand size={18} />
              </span>
            </button>
          )}
          <Lightbox
            images={[{ src: heroUrl, alt: title }]}
            index={heroZoomed ? 0 : null}
            onIndexChange={(next) => setHeroZoomed(next !== null)}
            title={title}
          />
        </div>
      ) : null}

      {post.source === "cms" && post.contentJson ? (
        <div className="mx-auto mt-10 max-w-3xl text-white/90"><ArticleBody document={post.contentJson} imageUrls={post.inlineImageUrls} title={title} /></div>
      ) : post.contentHtml ? (
        <div className="mx-auto mt-10 max-w-3xl [&_a]:font-bold [&_a]:text-accent [&_a]:underline [&_.hashtag]:font-bold [&_.hashtag]:text-accent">
          {parsePostBody(removeEmoji(post.contentHtml), title).map(
            (block, index) => {
              if (block.kind === "tags") {
                return (
                  <div key={index} className="mt-10 flex flex-wrap gap-2">
                    {block.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-bold text-accent"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                );
              }
              if (block.kind === "shout") {
                return (
                  <p
                    key={index}
                    className="mt-8 border-l-4 border-primary pl-4 text-lg font-black uppercase tracking-wide text-primary md:text-xl"
                    dangerouslySetInnerHTML={{ __html: block.html }}
                  />
                );
              }
              if (block.kind === "lede") {
                return (
                  <p
                    key={index}
                    className="mt-2 text-xl font-medium leading-9 text-white"
                    dangerouslySetInnerHTML={{ __html: block.html }}
                  />
                );
              }
              return (
                <p
                  key={index}
                  className="mt-6 text-base leading-8 text-white/85"
                  dangerouslySetInnerHTML={{ __html: block.html }}
                />
              );
            },
          )}
        </div>
      ) : null}

      {post.source === "cms" && post.videoUrl ? (
        <ArticleVideo url={post.videoUrl} title={title} />
      ) : null}

      <ArticleGallery urls={gallery} title={title} />
    </article>
  );
}

function DetailShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-3xl rounded-lg border border-border bg-card p-8 text-muted-foreground shadow-sm">
        {children}
      </div>
    </div>
  );
}
