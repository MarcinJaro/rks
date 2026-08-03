"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { youtubeEmbedUrl } from "@/lib/youtube";

function LiveNowInner() {
  const stream = useQuery(api.liveStreams.active);
  if (!stream) return null;

  const embedUrl = youtubeEmbedUrl(stream.youtubeUrl);
  if (!embedUrl) return null;

  return (
    <section className="container-page py-10">
      <div className="rounded-[24px] border border-white/8 bg-card p-6">
        <p className="flex items-center gap-2 text-sm font-black uppercase text-primary">
          <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
          Mecz live
        </p>
        <h2 className="mt-3 text-2xl font-black text-white">{stream.title}</h2>
        <div className="mt-5 aspect-video overflow-hidden rounded-[14px]">
          <iframe
            src={embedUrl}
            title={stream.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}

export function LiveNow() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return null;
  return <LiveNowInner />;
}
