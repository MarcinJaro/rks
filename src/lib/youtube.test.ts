import { expect, test } from "vitest";
import { youtubeThumbnailUrl } from "./youtube";

test("builds a thumbnail URL from any supported YouTube link form", () => {
  expect(youtubeThumbnailUrl("https://youtu.be/QXjIkmIJ_B4")).toBe(
    "https://i.ytimg.com/vi/QXjIkmIJ_B4/hqdefault.jpg",
  );
  expect(
    youtubeThumbnailUrl(
      "https://www.youtube.com/watch?v=QXjIkmIJ_B4&t=12s",
      "maxresdefault",
    ),
  ).toBe("https://i.ytimg.com/vi/QXjIkmIJ_B4/maxresdefault.jpg");
});

test("non-YouTube URL has no thumbnail", () => {
  expect(youtubeThumbnailUrl("https://www.facebook.com/reel/1/")).toBeNull();
});
