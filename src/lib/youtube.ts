export function extractYoutubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|live\/|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  return match ? match[1] : null;
}

export function youtubeEmbedUrl(url: string): string | null {
  const id = extractYoutubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

export type YoutubeThumbnailQuality = "hqdefault" | "maxresdefault";

/**
 * hqdefault (480x360) istnieje dla każdego filmu; maxresdefault (1280x720)
 * tylko dla filmów wgranych w HD - przy 404 trzeba spaść na hqdefault.
 */
export function youtubeThumbnailUrl(
  url: string,
  quality: YoutubeThumbnailQuality = "hqdefault",
): string | null {
  const id = extractYoutubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/${quality}.jpg` : null;
}
