"use client";

import { Fragment, useState, type ReactNode } from "react";
import { Lightbox, type LightboxImage } from "@/components/shared/Lightbox";
import {
  parseArticleDocument,
  safeArticleLink,
  type ArticleNode,
} from "@/lib/articleDocument";

export function ArticleBody({
  document,
  imageUrls,
  title = "Zdjęcia w artykule",
}: {
  document: string;
  imageUrls: Record<string, string | null>;
  title?: string;
}) {
  const [zoomed, setZoomed] = useState<number | null>(null);
  // Zdjęcia z treści w kolejności czytania - lightbox przewija między nimi.
  const zoomable: LightboxImage[] = [];
  let root: ArticleNode;
  try {
    root = parseArticleDocument(document);
  } catch {
    return <p>Treść artykułu jest niedostępna.</p>;
  }
  function render(node: ArticleNode, index: number): ReactNode {
    const children = node.content?.map(render);
    if (node.type === "text") {
      let text: ReactNode = node.text;
      for (const mark of node.marks ?? []) {
        if (mark.type === "bold") text = <strong>{text}</strong>;
        if (mark.type === "italic") text = <em>{text}</em>;
        if (mark.type === "underline") text = <u>{text}</u>;
        if (mark.type === "strike") text = <s>{text}</s>;
        if (mark.type === "link" && safeArticleLink(mark.attrs?.href ?? ""))
          text = (
            <a href={mark.attrs?.href} rel="noopener noreferrer">
              {text}
            </a>
          );
      }
      return <Fragment key={index}>{text}</Fragment>;
    }
    switch (node.type) {
      case "doc":
        return <Fragment key={index}>{children}</Fragment>;
      case "paragraph":
        return <p key={index}>{children?.length ? children : <br />}</p>;
      case "heading":
        return node.attrs?.level === 3 ? (
          <h3 key={index}>{children}</h3>
        ) : (
          <h2 key={index}>{children}</h2>
        );
      case "bulletList":
        return <ul key={index}>{children}</ul>;
      case "orderedList":
        return <ol key={index}>{children}</ol>;
      case "listItem":
        return <li key={index}>{children}</li>;
      case "blockquote":
        return <blockquote key={index}>{children}</blockquote>;
      case "horizontalRule":
        return <hr key={index} />;
      case "hardBreak":
        return <br key={index} />;
      case "image": {
        const url =
          imageUrls[
            node.attrs?.storageId
              ? String(node.attrs.storageId)
              : `legacy:${node.attrs?.legacyIndex}`
          ];
        if (!url) return null;
        const alt = String(node.attrs?.alt ?? "");
        const caption = node.attrs?.title ? String(node.attrs.title) : null;
        const position = zoomable.push({ src: url, alt, caption }) - 1;
        return (
          <figure key={index} style={{ width: `${node.attrs?.width ?? 100}%` }}>
            <button
              type="button"
              className="article-zoom"
              aria-label={alt ? `Powiększ zdjęcie: ${alt}` : "Powiększ zdjęcie"}
              onClick={() => setZoomed(position)}
            >
              {/* Uploaded media has dynamic natural dimensions. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={alt} loading="lazy" />
            </button>
            {caption ? <figcaption>{caption}</figcaption> : null}
          </figure>
        );
      }
      default:
        return null;
    }
  }
  const body = render(root, 0);
  return (
    <>
      <div className="article-prose">{body}</div>
      <Lightbox
        images={zoomable}
        index={zoomed}
        onIndexChange={setZoomed}
        title={title}
      />
    </>
  );
}
