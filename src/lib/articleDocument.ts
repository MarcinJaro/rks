// Small, portable allowlist shared by the editor, renderer and Convex.
export type ArticleNode = {
  type: string;
  text?: string;
  attrs?: Record<string, string | number | null>;
  marks?: { type: string; attrs?: Record<string, string> }[];
  content?: ArticleNode[];
};
export function safeArticleLink(value: string) {
  return /^(https?:\/\/|mailto:)/i.test(value) ? value : undefined;
}
export function parseArticleDocument(value: string): ArticleNode {
  if (value.length > 300_000) throw new Error("Treść artykułu jest za długa");
  const root = JSON.parse(value);
  let count = 0;
  const types = new Set([
    "doc",
    "paragraph",
    "text",
    "heading",
    "bulletList",
    "orderedList",
    "listItem",
    "blockquote",
    "hardBreak",
    "horizontalRule",
    "image",
  ]);
  function clean(node: ArticleNode, depth: number): ArticleNode {
    if (
      !node ||
      typeof node !== "object" ||
      !types.has(node.type) ||
      depth > 20 ||
      ++count > 10000
    )
      throw new Error("Nieprawidłowa treść artykułu");
    const result: ArticleNode = { type: node.type };
    if (node.type === "text") {
      if (typeof node.text !== "string") throw new Error("Nieprawidłowy tekst");
      result.text = node.text;
      result.marks = (node.marks ?? [])
        .filter((m) =>
          ["bold", "italic", "strike", "underline", "link"].includes(m.type),
        )
        .map((m) =>
          m.type === "link"
            ? {
                type: m.type,
                attrs: { href: safeArticleLink(m.attrs?.href ?? "") ?? "" },
              }
            : { type: m.type },
        );
    }
    if (node.type === "heading")
      result.attrs = { level: node.attrs?.level === 3 ? 3 : 2 };
    if (node.type === "orderedList") result.attrs = { start: 1 };
    if (node.type === "image") {
      const storageId = node.attrs?.storageId;
      const legacyIndex = node.attrs?.legacyIndex;
      if (
        (typeof storageId !== "string" || !storageId) &&
        !(
          typeof legacyIndex === "number" &&
          Number.isInteger(legacyIndex) &&
          legacyIndex >= 0 &&
          legacyIndex < 60
        )
      )
        throw new Error("Zdjęcie musi zostać przesłane do biblioteki");
      result.attrs = {
        ...(typeof storageId === "string" && storageId
          ? { storageId }
          : { legacyIndex: Number(legacyIndex) }),
        alt: String(node.attrs?.alt ?? "").slice(0, 500),
        title: String(node.attrs?.title ?? "").slice(0, 500),
        width: [50, 75, 100].includes(Number(node.attrs?.width))
          ? Number(node.attrs?.width)
          : 100,
      };
    }
    if (node.content) {
      if (!Array.isArray(node.content)) throw new Error("Nieprawidłowa treść");
      result.content = node.content.map((child) => clean(child, depth + 1));
    }
    return result;
  }
  if (root.type !== "doc") throw new Error("Nieprawidłowy dokument");
  return clean(root, 0);
}
export function articleImageIds(node: ArticleNode): string[] {
  return [
    ...new Set([
      ...(node.type === "image" && node.attrs?.storageId
        ? [String(node.attrs.storageId)]
        : []),
      ...(node.content ?? []).flatMap(articleImageIds),
    ]),
  ];
}
export function hydrateArticleDocument(
  node: ArticleNode,
  urls: Record<string, string | null>,
): ArticleNode {
  return {
    ...node,
    ...(node.type === "image"
      ? {
          attrs: {
            ...node.attrs,
            src:
              urls[
                node.attrs?.storageId
                  ? String(node.attrs.storageId)
                  : `legacy:${node.attrs?.legacyIndex}`
              ] ?? "",
          },
        }
      : {}),
    ...(node.content
      ? {
          content: node.content.map((child) =>
            hydrateArticleDocument(child, urls),
          ),
        }
      : {}),
  };
}

// Legacy imports stored inline media only in HTML. Keep positional references
// until those articles are migrated, without duplicating stored delivery URLs.
export function legacyImageUrls(html: string): string[] {
  return [...html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => match[1])
    .filter((url) => /^https?:\/\//i.test(url));
}
export function legacyImageIndexes(node: ArticleNode): number[] {
  return [
    ...(node.type === "image" && typeof node.attrs?.legacyIndex === "number"
      ? [node.attrs.legacyIndex]
      : []),
    ...(node.content ?? []).flatMap(legacyImageIndexes),
  ];
}
