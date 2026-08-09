import { extractYoutubeId } from "./youtube";

/** FB wraps outbound links in l.facebook.com/l.php?u=<encoded target>. */
export function unwrapFacebookRedirect(url: string): string {
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname === "l.facebook.com" &&
      parsed.pathname === "/l.php"
    ) {
      const target = parsed.searchParams.get("u");
      if (target) return target;
    }
  } catch {
    // not a valid URL — fall through
  }
  return url;
}

export type VideoEmbed = {
  provider: "youtube" | "facebook";
  src: string;
  /** Reels are 9:16 — the player container should be portrait. */
  portrait: boolean;
};

export function getVideoEmbed(videoUrl: string): VideoEmbed | null {
  const url = unwrapFacebookRedirect(videoUrl);

  const youtubeId = extractYoutubeId(url);
  if (youtubeId) {
    return {
      provider: "youtube",
      src: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
      portrait: false,
    };
  }

  try {
    const parsed = new URL(url);
    const isFacebook = /(^|\.)facebook\.com$/.test(parsed.hostname);
    const path = parsed.pathname + parsed.search;
    if (isFacebook && /\/(reel|videos?|watch)/.test(path)) {
      return {
        provider: "facebook",
        src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`,
        portrait: parsed.pathname.startsWith("/reel"),
      };
    }
  } catch {
    // not a valid URL
  }

  return null;
}
