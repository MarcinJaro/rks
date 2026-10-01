import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";
const draft = {
  title: "Relacja",
  slug: "relacja",
  content: "Tekst",
  contentHtml: "<p>Tekst</p>",
  status: "draft" as const,
};
function setup() {
  const t = convexTest(schema, modules);
  return {
    t,
    admin: t.withIdentity({ subject: "admin", email: "admin@rksokecie.pl" }),
  };
}
describe("article editor", () => {
  it("rejects unauthorized edits", async () => {
    const { t } = setup();
    await expect(t.mutation(api.articles.saveDraft, draft)).rejects.toThrow(
      "Brak autoryzacji",
    );
  });
  it("does not overwrite a colliding slug and edits by id", async () => {
    const { t, admin } = setup();
    const id = await admin.mutation(api.articles.saveDraft, draft);
    await expect(
      admin.mutation(api.articles.saveDraft, { ...draft, title: "Inny" }),
    ).rejects.toThrow("zajęty");
    await admin.mutation(api.articles.saveDraft, {
      ...draft,
      id,
      title: "Poprawiony",
    });
    expect((await t.run((ctx) => ctx.db.get(id)))?.title).toBe("Poprawiony");
  });
  it("keeps drafts private", async () => {
    const { t, admin } = setup();
    await admin.mutation(api.articles.saveDraft, draft);
    expect(
      await t.query(api.articles.getBySlug, { slug: draft.slug }),
    ).toBeNull();
    expect(
      await t.query(api.feed.getPostBySlug, { slug: draft.slug }),
    ).toBeNull();
  });
  it("persists image ordering and strips transient image URLs", async () => {
    const { t, admin } = setup();
    const [one, two] = await t.run(async (ctx) =>
      Promise.all([
        ctx.storage.store(new Blob(["a"], { type: "image/webp" })),
        ctx.storage.store(new Blob(["b"], { type: "image/jpeg" })),
      ]),
    );
    // convex-test 0.0.54 omits MIME metadata when storing Blobs.
    await t.run(async (ctx) => {
      const db = ctx.db as unknown as {
        patch(id: string, value: { contentType: string }): Promise<void>;
      };
      await db.patch(one, { contentType: "image/webp" });
      await db.patch(two, { contentType: "image/jpeg" });
    });
    const contentJson = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "image",
          attrs: {
            storageId: one,
            src: "https://temporary.example/image",
            alt: "Drużyna",
            title: "Po meczu",
            width: 75,
          },
        },
      ],
    });
    const id = await admin.mutation(api.articles.saveDraft, {
      ...draft,
      status: "published",
      contentJson,
      inlineImageIds: [one],
      galleryIds: [two, one],
    });
    const saved = await t.run((ctx) => ctx.db.get(id));
    expect(saved?.contentJson).not.toContain("temporary.example");
    expect(saved?.galleryIds).toEqual([two, one]);
    const post = await t.query(api.feed.getPostBySlug, { slug: draft.slug });
    expect(post?.source === "cms" && post.inlineImageUrls[one]).toMatch(
      /^https?:/,
    );
    await admin.mutation(api.articles.saveDraft, {
      ...draft,
      id,
      contentJson: JSON.stringify({
        type: "doc",
        content: [{ type: "paragraph" }],
      }),
      inlineImageIds: [],
      galleryIds: [],
    });
    // Undo/reuse must not point at a deleted file.
    expect(await t.run((ctx) => ctx.storage.getUrl(one))).toBeTruthy();
  });
  it("rejects mismatched or non-image media", async () => {
    const { t, admin } = setup();
    const file = await t.run((ctx) =>
      ctx.storage.store(new Blob(["text"], { type: "text/plain" })),
    );
    await expect(
      admin.mutation(api.articles.saveDraft, { ...draft, galleryIds: [file] }),
    ).rejects.toThrow("plik");
    await expect(
      admin.mutation(api.articles.saveDraft, {
        ...draft,
        contentJson: JSON.stringify({
          type: "doc",
          content: [{ type: "image", attrs: { storageId: file } }],
        }),
        inlineImageIds: [],
      }),
    ).rejects.toThrow("Niezgodna");
  });
});

it("preserves legacy inline images when editing and rejects forged legacy references", async () => {
  const { t, admin } = setup();
  const originalHtml =
    '<p>Stara relacja</p><img src="https://example.com/legacy.jpg" alt="" />';
  const id = await t.run((ctx) =>
    ctx.db.insert("articles", { ...draft, contentHtml: originalHtml }),
  );
  const contentJson = JSON.stringify({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Poprawiona relacja" }],
      },
      { type: "image", attrs: { legacyIndex: 0, alt: "Stadion", width: 75 } },
    ],
  });
  expect(await admin.query(api.articles.adminMedia, { id })).toMatchObject({
    "legacy:0": "https://example.com/legacy.jpg",
  });
  await admin.mutation(api.articles.saveDraft, {
    ...draft,
    id,
    status: "published",
    content: "Poprawiona relacja",
    contentJson,
    inlineImageIds: [],
  });
  const post = await t.query(api.feed.getPostBySlug, { slug: draft.slug });
  expect(post?.source === "cms" && post.inlineImageUrls["legacy:0"]).toBe(
    "https://example.com/legacy.jpg",
  );
  expect(post?.content).toBe("Poprawiona relacja");
  await expect(
    admin.mutation(api.articles.saveDraft, {
      ...draft,
      slug: "forged",
      contentJson,
      inlineImageIds: [],
    }),
  ).rejects.toThrow("starszego zdjęcia");
});
