import { stripEmoji } from "./feedText";

/**
 * Zamienia surowy contentHtml posta z FB (tekst rozdzielany <br><br>,
 * hasztagi w <span class="hashtag">) na bloki do ciekawszego składu:
 * - pomija pierwszy akapit, gdy powtarza tytuł (H1 już go pokazuje),
 * - krótkie linie pisane wersalikami zamienia w wyróżnione okrzyki,
 * - akapity złożone z samych hasztagów zbiera w listę tagów na końcu.
 */
export type PostBlock =
  | { kind: "lede"; html: string }
  | { kind: "paragraph"; html: string }
  | { kind: "shout"; html: string }
  | { kind: "tags"; tags: string[] };

const HASHTAG_RE = /<span class="hashtag">(#[^<]+)<\/span>/g;

function plainText(html: string): string {
  return stripEmoji(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function isShout(text: string): boolean {
  return (
    text.length > 0 &&
    text.length <= 48 &&
    /\p{Lu}/u.test(text) &&
    text === text.toLocaleUpperCase("pl-PL")
  );
}

export function parsePostBody(contentHtml: string, title: string): PostBlock[] {
  const paragraphs = contentHtml
    .split(/(?:<br\s*\/?>\s*){2,}/i)
    .map((part) => part.trim())
    .filter(Boolean);

  const blocks: PostBlock[] = [];
  const tags: string[] = [];
  const normTitle = stripEmoji(title).replace(/\s+/g, " ").trim();

  paragraphs.forEach((paragraph, index) => {
    const text = plainText(paragraph);

    // Pierwsza linia posta jest źródłem tytułu - nie powtarzamy jej pod H1.
    if (index === 0 && text === normTitle) return;

    const withoutTags = paragraph.replace(HASHTAG_RE, "").trim();
    const tagMatches = [...paragraph.matchAll(HASHTAG_RE)].map((m) => m[1]);
    if (tagMatches.length > 0 && plainText(withoutTags) === "") {
      tags.push(...tagMatches);
      return;
    }

    if (isShout(text)) {
      blocks.push({ kind: "shout", html: paragraph });
      return;
    }

    blocks.push({ kind: "paragraph", html: paragraph });
  });

  // Pierwszy zwykły akapit awansuje na lede (większy stopień pisma).
  const firstParagraph = blocks.findIndex((block) => block.kind === "paragraph");
  if (firstParagraph !== -1) {
    blocks[firstParagraph] = {
      kind: "lede",
      html: (blocks[firstParagraph] as { html: string }).html,
    };
  }

  if (tags.length > 0) blocks.push({ kind: "tags", tags: [...new Set(tags)] });

  return blocks;
}
