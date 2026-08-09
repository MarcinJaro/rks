import { expect, test } from "vitest";
import { getVideoEmbed, unwrapFacebookRedirect } from "./videoEmbed";

test("unwraps l.facebook.com redirect to the target URL", () => {
  expect(
    unwrapFacebookRedirect(
      "https://l.facebook.com/l.php?u=https%3A%2F%2Fyoutu.be%2FQXjIkmIJ_B4%3Ffbclid%3Dabc",
    ),
  ).toBe("https://youtu.be/QXjIkmIJ_B4?fbclid=abc");
  expect(unwrapFacebookRedirect("https://youtu.be/QXjIkmIJ_B4")).toBe(
    "https://youtu.be/QXjIkmIJ_B4",
  );
});

test("YouTube link (also FB-wrapped) becomes a nocookie embed", () => {
  const wrapped = getVideoEmbed(
    "https://l.facebook.com/l.php?u=https%3A%2F%2Fyoutu.be%2FQXjIkmIJ_B4%3Ffbclid%3Dabc",
  );
  expect(wrapped).toEqual({
    provider: "youtube",
    src: "https://www.youtube-nocookie.com/embed/QXjIkmIJ_B4",
    portrait: false,
  });
});

test("Facebook reel becomes a portrait plugin embed", () => {
  const embed = getVideoEmbed("https://www.facebook.com/reel/1666517735477333/");
  expect(embed?.provider).toBe("facebook");
  expect(embed?.portrait).toBe(true);
  expect(embed?.src).toBe(
    "https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Freel%2F1666517735477333%2F&show_text=false",
  );
});

test("Facebook page video becomes a landscape plugin embed", () => {
  const embed = getVideoEmbed(
    "https://www.facebook.com/watch/?v=123456789",
  );
  expect(embed?.provider).toBe("facebook");
  expect(embed?.portrait).toBe(false);
});

test("non-video URL returns null", () => {
  expect(getVideoEmbed("https://example.com/artykul")).toBeNull();
});
