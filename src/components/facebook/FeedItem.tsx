import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, PlayCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

export type FeedItemProps = {
  title: string;
  content: string;
  imageUrl?: string | null;
  imageFit?: "cover" | "contain";
  mediaType?: "article" | "video";
  publishedAt: number;
  source: string;
  url: string;
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
}: FeedItemProps) {
  const imageSrc = imageUrl || "/images/rks-logo.png";
  const isExternal = url.startsWith("http");

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-white/8 bg-[var(--feed-card)] shadow-sm shadow-black/20">
      <div
        className={`relative bg-[var(--feed-media)] ${
          imageFit === "contain" ? "aspect-square" : "aspect-[16/11]"
        }`}
      >
        <Image
          src={imageSrc}
          alt={title}
          fill
          sizes="(min-width: 1024px) 33vw, 100vw"
          className={
            imageUrl && imageFit === "cover"
              ? "object-cover transition duration-500 group-hover:scale-105"
              : imageUrl
                ? "object-contain p-3"
                : "object-contain p-14"
          }
        />
        {mediaType === "video" ? (
          <div className="absolute inset-0 grid place-items-center bg-black/20">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-accent text-[#002e5e] shadow-2xl shadow-black/30">
              <PlayCircle size={36} />
            </span>
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs font-black uppercase text-[#a6aabc]">
          <span className="rounded-md bg-accent px-2.5 py-1 text-[#002e5e]">
            {mediaType === "video" ? "Video" : "Aktualność"}
          </span>
          <time dateTime={new Date(publishedAt).toISOString()}>
            {formatDate(publishedAt)}
          </time>
        </div>
        <h3 className="line-clamp-2 text-xl font-black leading-tight text-white">
          {title}
        </h3>
        <p className="mt-4 line-clamp-5 text-sm leading-6 text-[#dce2f6]">
          {content}
        </p>
        <Link
          href={url}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className="mt-6 inline-flex w-fit items-center gap-1.5 text-sm font-black text-accent hover:underline"
        >
          {mediaType === "video"
            ? "Otwórz video"
            : source === "facebook"
              ? "Zobacz źródło"
              : "Czytaj aktualność"}
          <ArrowUpRight size={15} />
        </Link>
      </div>
    </article>
  );
}
