import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import schema from "./schema";

const DAY = 24 * 60 * 60 * 1000;
// 1 czerwca 2026 00:00 UTC
const JUNE_1 = Date.UTC(2026, 5, 1);
const JULY_1 = Date.UTC(2026, 6, 1);

type FbPostFields = Omit<Doc<"fbPosts">, "_id" | "_creationTime">;
type ArticleFields = Omit<Doc<"articles">, "_id" | "_creationTime">;

function fbPost(
  n: number,
  publishedAt: number,
  overrides: Partial<FbPostFields> = {},
): FbPostFields {
  return {
    fbPostId: `fb-${n}`,
    slug: `post-${n}`,
    content: `Post ${n}`,
    postType: "text",
    reactionsCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    isPinned: false,
    isHidden: false,
    fbUrl: `https://facebook.com/${n}`,
    publishedAt,
    syncedAt: publishedAt,
    ...overrides,
  };
}

function article(
  n: number,
  publishedAt: number | undefined,
  overrides: Partial<ArticleFields> = {},
): ArticleFields {
  return {
    title: `Artykuł ${n}`,
    slug: `artykul-${n}`,
    content: `Treść artykułu ${n}`,
    contentHtml: `<p>Treść artykułu ${n}</p>`,
    status: "published",
    publishedAt,
    ...overrides,
  };
}

async function seed(
  t: ReturnType<typeof convexTest>,
  posts: FbPostFields[],
  articles: ArticleFields[] = [],
) {
  await t.run(async (ctx) => {
    for (const post of posts) await ctx.db.insert("fbPosts", post);
    for (const doc of articles) await ctx.db.insert("articles", doc);
  });
}

describe("getNewsFeedPage", () => {
  it("stronicuje feed bez duplikatów, malejąco po dacie", async () => {
    const t = convexTest(schema);
    await seed(
      t,
      Array.from({ length: 15 }, (_, i) => fbPost(i, JUNE_1 + i * DAY)),
      [
        article(0, JUNE_1 + 15 * DAY),
        article(1, JUNE_1 + 16 * DAY),
        article(2, JUNE_1 + 17 * DAY),
      ],
    );

    const first = await t.query(api.feed.getNewsFeedPage, {
      numItems: 12,
      cursor: null,
    });
    expect(first.page).toHaveLength(12);
    expect(first.isDone).toBe(false);

    const dates = first.page.map((item) => item.publishedAt);
    expect(dates).toEqual([...dates].sort((a, b) => b - a));

    const second = await t.query(api.feed.getNewsFeedPage, {
      numItems: 12,
      cursor: first.continueCursor,
    });
    expect(second.page).toHaveLength(6);
    expect(second.isDone).toBe(true);

    const ids = [...first.page, ...second.page].map((item) => item._id);
    expect(new Set(ids).size).toBe(18);
  });

  it("pomija ukryte posty i nieopublikowane artykuły", async () => {
    const t = convexTest(schema);
    await seed(
      t,
      [
        fbPost(0, JUNE_1),
        fbPost(1, JUNE_1 + DAY, { isHidden: true }),
      ],
      [
        article(0, JUNE_1 + 2 * DAY),
        article(1, JUNE_1 + 3 * DAY, { status: "draft" }),
      ],
    );

    const result = await t.query(api.feed.getNewsFeedPage, {
      numItems: 12,
      cursor: null,
    });
    expect(result.page).toHaveLength(2);
    expect(result.isDone).toBe(true);
    expect(
      result.page.every(
        (item) =>
          item.content?.includes("0") ||
          (item.source === "cms" && item.title === "Artykuł 0"),
      ),
    ).toBe(true);
  });

  it("filtruje po kategorii posty i artykuły", async () => {
    const t = convexTest(schema);
    await seed(
      t,
      [
        fbPost(0, JUNE_1, { category: "mecz" }),
        fbPost(1, JUNE_1 + DAY, { category: "trening" }),
        fbPost(2, JUNE_1 + 2 * DAY, { category: "mecz", isHidden: true }),
      ],
      [
        article(0, JUNE_1 + 3 * DAY, { category: "mecz" }),
        article(1, JUNE_1 + 4 * DAY, { category: "turniej" }),
      ],
    );

    const result = await t.query(api.feed.getNewsFeedPage, {
      numItems: 12,
      cursor: null,
      category: "mecz",
    });
    expect(result.page).toHaveLength(2);
    expect(result.page.every((item) => item.category === "mecz")).toBe(true);
  });

  it("ogranicza wyniki do wybranego miesiąca", async () => {
    const t = convexTest(schema);
    await seed(
      t,
      [
        fbPost(0, JUNE_1 - DAY), // maj
        fbPost(1, JUNE_1 + 5 * DAY), // czerwiec
        fbPost(2, JULY_1 + DAY), // lipiec
      ],
      [
        article(0, JUNE_1 + 10 * DAY), // czerwiec
        article(1, JULY_1 + 2 * DAY), // lipiec
      ],
    );

    const result = await t.query(api.feed.getNewsFeedPage, {
      numItems: 12,
      cursor: null,
      monthStart: JUNE_1,
      monthEnd: JULY_1,
    });
    expect(result.page).toHaveLength(2);
    expect(
      result.page.every(
        (item) => item.publishedAt >= JUNE_1 && item.publishedAt < JULY_1,
      ),
    ).toBe(true);
  });

  it("wynosi przypięte posty na początek tylko pierwszej strony, bez psucia kursora", async () => {
    const t = convexTest(schema);
    await seed(t, [
      ...Array.from({ length: 14 }, (_, i) => fbPost(i, JUNE_1 + i * DAY)),
      // przypięty post w oknie pierwszej strony, ale nie najnowszy
      fbPost(14, JUNE_1 + 6 * DAY - 1, { isPinned: true }),
    ]);

    const first = await t.query(api.feed.getNewsFeedPage, {
      numItems: 12,
      cursor: null,
    });
    expect(first.page[0].isPinned).toBe(true);

    const second = await t.query(api.feed.getNewsFeedPage, {
      numItems: 12,
      cursor: first.continueCursor,
    });

    const ids = [...first.page, ...second.page].map((item) => item._id);
    expect(new Set(ids).size).toBe(15);
    expect(ids).toHaveLength(15);
    expect(second.isDone).toBe(true);
  });

  it("artykuł bez publishedAt pojawia się dokładnie raz (fallback na _creationTime)", async () => {
    const t = convexTest(schema);
    await seed(
      t,
      Array.from({ length: 3 }, (_, i) => fbPost(i, JUNE_1 + i * DAY)),
      [article(0, undefined)],
    );

    const first = await t.query(api.feed.getNewsFeedPage, {
      numItems: 3,
      cursor: null,
    });
    const second = await t.query(api.feed.getNewsFeedPage, {
      numItems: 3,
      cursor: first.continueCursor,
    });

    const all = [...first.page, ...second.page];
    const articleItems = all.filter((item) => item.source === "cms");
    expect(articleItems).toHaveLength(1);
    expect(new Set(all.map((item) => item._id)).size).toBe(all.length);
    expect(second.isDone).toBe(true);
  });
});

describe("getNewsArchiveRange", () => {
  it("zwraca najstarszą datę widocznego wpisu", async () => {
    const t = convexTest(schema);
    await seed(
      t,
      [
        fbPost(0, JUNE_1 - 10 * DAY, { isHidden: true }),
        fbPost(1, JUNE_1),
        fbPost(2, JUNE_1 + DAY),
      ],
      [article(0, JUNE_1 + 5 * DAY)],
    );

    const result = await t.query(api.feed.getNewsArchiveRange, {});
    expect(result.oldestPublishedAt).toBe(JUNE_1);
  });

  it("zwraca null przy pustej bazie", async () => {
    const t = convexTest(schema);
    const result = await t.query(api.feed.getNewsArchiveRange, {});
    expect(result.oldestPublishedAt).toBeNull();
  });
});
