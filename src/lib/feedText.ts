const EMOJI_PATTERN =
  /[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}\u{1F3FB}-\u{1F3FF}\u{1F1E6}-\u{1F1FF}]/gu;

/** Removes emoji characters only — safe for HTML strings (never touches tags). */
export function removeEmoji(text: string): string {
  return text.replace(EMOJI_PATTERN, "").replace(/ {2,}/g, " ");
}

export function stripEmoji(text: string): string {
  return text
    .replace(EMOJI_PATTERN, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s\p{P}]+|[\s]+$/gu, "")
    .trim();
}

export function buildFeedTitle(content: string, fallback = "RKS Okęcie Warszawa"): string {
  const firstLine = content
    .split("\n")
    .map((line) => stripEmoji(line))
    .find(Boolean);
  if (!firstLine) return fallback;
  return firstLine.length > 90 ? `${firstLine.slice(0, 87)}...` : firstLine;
}

const POLISH_MAP: Record<string, string> = {
  ą: "a",
  ć: "c",
  ę: "e",
  ł: "l",
  ń: "n",
  ó: "o",
  ś: "s",
  ź: "z",
  ż: "z",
};

export function slugifyTitle(
  content: string | undefined,
  fbPostId: string,
): string {
  const title = content ? buildFeedTitle(content, "") : "";
  const base = title
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (ch) => POLISH_MAP[ch] ?? ch)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  // Suffix from the FB post id keeps slugs unique even for identical titles.
  const idPart = fbPostId.split("_").pop() || fbPostId;
  const suffix = idPart.slice(-6);
  return base ? `${base}-${suffix}` : `wpis-${suffix}`;
}
