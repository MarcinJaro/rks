import Image from "next/image";
import Link from "next/link";
import { MessageSquare, ThumbsUp } from "lucide-react";
import { formatDate } from "@/lib/utils";

type FeedItemProps = {
  title: string;
  content: string;
  imageUrl: string;
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
  publishedAt,
  source,
  url,
  engagement,
}: FeedItemProps) {
  return (
    <article className="overflow-hidden rounded-[28px] bg-[#191f31] shadow-2xl shadow-black/20">
      <div className="p-6">
        <div className="mb-8 flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-sm font-black text-[#002e5e]">
            R
          </span>
          <div>
            <p className="text-sm font-black text-white">RKS Okęcie Warszawa</p>
            <time
              className="text-xs text-[#a6aabc]"
              dateTime={new Date(publishedAt).toISOString()}
            >
              {source === "facebook" ? "2 godz. temu" : formatDate(publishedAt)}
            </time>
          </div>
        </div>
        <p className="line-clamp-4 min-h-24 text-sm leading-6 text-[#e4e7fb]">
          {content}
        </p>
      </div>
      <div className="relative aspect-square">
        <Image
          src={imageUrl}
          alt={title}
          fill
          sizes="(min-width: 1024px) 33vw, 100vw"
          className="object-cover"
        />
      </div>
      <div className="flex items-center justify-between border-t border-white/5 p-6 text-xs font-bold text-[#a6aabc]">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <ThumbsUp size={15} /> {engagement?.reactions || 0}
          </span>
          <span className="flex items-center gap-1.5">
            <MessageSquare size={15} /> {engagement?.comments || 0}
          </span>
        </div>
        <Link
          href={url}
          target={url.startsWith("http") ? "_blank" : undefined}
          rel={url.startsWith("http") ? "noopener noreferrer" : undefined}
          className="text-accent hover:underline"
        >
          Zobacz na Facebooku
        </Link>
      </div>
    </article>
  );
}
