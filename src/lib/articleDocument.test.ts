import { expect, it } from "vitest";
import { parseArticleDocument, safeArticleLink } from "./articleDocument";
it("drops unsafe links and arbitrary image attributes", () => {
  expect(safeArticleLink("javascript:alert(1)")).toBeUndefined();
  const doc = parseArticleDocument(
    JSON.stringify({
      type: "doc",
      content: [
        {
          type: "image",
          attrs: {
            storageId: "abc",
            onerror: "alert(1)",
            src: "data:image/svg+xml,bad",
            width: 900,
          },
        },
      ],
    }),
  );
  expect(doc.content?.[0].attrs).toEqual({
    storageId: "abc",
    alt: "",
    title: "",
    width: 100,
  });
});
it("rejects foreign nodes and excessive nesting", () => {
  expect(() =>
    parseArticleDocument('{"type":"doc","content":[{"type":"script"}]}'),
  ).toThrow();
  let node: object = { type: "paragraph" };
  for (let i = 0; i < 25; i++) node = { type: "blockquote", content: [node] };
  expect(() =>
    parseArticleDocument(JSON.stringify({ type: "doc", content: [node] })),
  ).toThrow();
});
