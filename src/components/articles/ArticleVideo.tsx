"use client";

import { useState } from "react";
import { ExternalLink, PlayCircle } from "lucide-react";
import { getVideoEmbed } from "@/lib/videoEmbed";
import { youtubeThumbnailUrl } from "@/lib/youtube";

/**
 * Wideo z panelu (pole "Link YouTube") pokazywane w artykule nad galerią.
 * YouTube: najpierw miniatura z przyciskiem play, iframe ładuje się dopiero
 * po kliknięciu (lżejsza strona, brak ciasteczek YT bez interakcji).
 * Facebook: od razu iframe, bo FB nie udostępnia przewidywalnej miniatury.
 * Nierozpoznany adres: zwykły link, żeby wpisany w panelu URL nie zniknął.
 */
export function ArticleVideo({ url, title }: { url: string; title: string }) {
  const embed = getVideoEmbed(url);
  const [playing, setPlaying] = useState(false);
  // Próbujemy HD; przy braku (404) spadamy na zawsze dostępne hqdefault.
  const [thumbnail, setThumbnail] = useState(() =>
    youtubeThumbnailUrl(url, "maxresdefault"),
  );

  return (
    <section className="mx-auto mt-12 max-w-4xl" aria-label="Wideo">
      <h2 className="mb-4 text-xl font-bold">Wideo</h2>
      {!embed ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 font-bold text-accent underline"
        >
          Obejrzyj wideo <ExternalLink size={16} />
        </a>
      ) : (
        <div
          className={`relative mx-auto overflow-hidden rounded-xl border border-white/8 bg-black ${
            embed.portrait ? "aspect-[9/16] max-w-md" : "aspect-video"
          }`}
        >
          {embed.provider === "youtube" && !playing ? (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              aria-label={`Odtwórz wideo: ${title}`}
              className="group absolute inset-0 grid place-items-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              {thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbnail}
                  alt=""
                  loading="lazy"
                  onError={() =>
                    setThumbnail((current) =>
                      current?.includes("maxresdefault")
                        ? youtubeThumbnailUrl(url, "hqdefault")
                        : null,
                    )
                  }
                  className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-[1.02]"
                />
              ) : null}
              <span className="relative grid h-20 w-20 place-items-center rounded-full bg-accent text-[#002e5e] shadow-2xl shadow-black/40 transition group-hover:scale-105">
                <PlayCircle size={44} />
              </span>
            </button>
          ) : (
            <iframe
              src={
                embed.provider === "youtube"
                  ? `${embed.src}?autoplay=1`
                  : embed.src
              }
              title={title}
              allow="autoplay; encrypted-media; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          )}
        </div>
      )}
    </section>
  );
}
