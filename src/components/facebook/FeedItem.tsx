import Image from "next/image";
import { SmartCropImage } from "@/components/shared/SmartCropImage";
import Link from "next/link";
import { PlayCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { removeEmoji } from "@/lib/feedText";

export type FeedItemProps = {
  title: string;
  content: string;
  imageUrl?: string | null;
  imageFit?: "cover" | "contain";
  mediaType?: "article" | "video";
  publishedAt: number;
  source: string;
  url: string;
  slug?: string | null;
  variant?: "default" | "featured";
  engagement: null | {
    reactions: number;
    comments: number;
    shares: number;
  };
};

export function FeedItem({
  title,
  content,
  imageUrl,
  imageFit = "cover",
  mediaType = "article",
  publishedAt,
  source,
  url,
  slug,
  variant = "default",
}: FeedItemProps) {
  const imageSrc = imageUrl || "/images/rks-logo.png";
  // Next's image optimizer rejects IP-literal hosts, which the local Convex
  // backend uses for storage URLs in dev.
  const isLocalStorage = imageSrc.startsWith("http://127.0.0.1");
  const href =
    source === "facebook" ? (slug ? `/aktualnosci/${slug}` : undefined) : url;
  const featured = variant === "featured";

  const media = (
    <div
      className={`relative bg-[var(--feed-media)] ${
        featured
          ? "aspect-[16/10] md:aspect-auto md:min-h-full"
          : imageFit === "contain"
            ? "aspect-square"
            : "aspect-[16/11]"
      }`}
    >
      {imageUrl && imageFit === "cover" ? (
        <SmartCropImage
          src={imageSrc}
          alt={title}
          fill
          unoptimized={isLocalStorage}
          sizes={featured ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 1024px) 33vw, 100vw"}
          className="object-cover transition duration-500 group-hover:scale-105"
        />
      ) : (
        <Image
          src={imageSrc}
          alt={title}
          fill
          unoptimized={isLocalStorage}
          sizes={featured ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 1024px) 33vw, 100vw"}
          className={imageUrl ? "object-contain p-3" : "object-contain p-14"}
        />
      )}
      {mediaType === "video" ? (
        <div className="absolute inset-0 grid place-items-center bg-black/20">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-accent text-[#002e5e] shadow-2xl shadow-black/30">
            <PlayCircle size={36} />
          </span>
        </div>
      ) : null}
    </div>
  );

  const body = (
    <div className={`flex flex-1 flex-col ${featured ? "justify-center p-8 md:p-10" : "p-6"}`}>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs font-black uppercase text-muted-foreground">
        <span className="rounded-md bg-accent px-2.5 py-1 text-[#002e5e]">
          {mediaType === "video" ? "Video" : "Aktualność"}
        </span>
        <time dateTime={new Date(publishedAt).toISOString()}>
          {formatDate(publishedAt)}
        </time>
      </div>
      <h3
        className={`font-black leading-tight text-white ${
          featured ? "line-clamp-3 text-2xl md:text-4xl" : "line-clamp-2 text-xl"
        }`}
      >
        {title}
      </h3>
      <p
        className={`mt-4 text-sm leading-6 text-muted-foreground ${
          featured ? "line-clamp-4 md:text-base md:leading-7" : "line-clamp-5"
        }`}
      >
        {removeEmoji(content)}
      </p>
      {href ? (
        <span className="mt-6 inline-flex w-fit items-center gap-1.5 text-sm font-black text-accent group-hover:underline">
          Czytaj dalej →
        </span>
      ) : null}
    </div>
  );

  const card = (
    <article
      className={`group flex h-full overflow-hidden rounded-lg border border-white/8 bg-[var(--feed-card)] shadow-sm shadow-black/20 ${
        featured ? "flex-col md:grid md:grid-cols-2" : "flex-col"
      }`}
    >
      {media}
      {body}
    </article>
  );

  if (!href) return card;

  const isExternal = href.startsWith("http");
  return (
    <Link
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className="block h-full"
    >
      {card}
    </Link>
  );
}
