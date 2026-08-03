import { expect, test } from "vitest";
import {
  buildFeedTitle,
  removeEmoji,
  slugifyTitle,
  stripEmoji,
} from "./feedText";

test("removeEmoji strips emoji without touching HTML tags", () => {
  expect(removeEmoji('Obóz 🏕️💙 zakończony!<br><span class="hashtag">#RKS</span> ⚽')).toBe(
    'Obóz zakończony!<br><span class="hashtag">#RKS</span> ',
  );
});

test("stripEmoji removes flag emoji (regional indicators)", () => {
  expect(stripEmoji("🇵🇱 Pamiętamy!")).toBe("Pamiętamy!");
});

test("stripEmoji removes emoji and tidies whitespace", () => {
  expect(stripEmoji("🏕️💙 Obóz RKS Okęcie w Piszu dobiegł końca!")).toBe(
    "Obóz RKS Okęcie w Piszu dobiegł końca!",
  );
  expect(stripEmoji("Lecimy po kolejne sukcesy! ✈️💙🤍")).toBe(
    "Lecimy po kolejne sukcesy!",
  );
});

test("buildFeedTitle uses first non-empty line without emoji", () => {
  const content = "👕🔵⚪ Nowy sezon, nowy wygląd!\n\nZ ogromną radością...";
  expect(buildFeedTitle(content)).toBe("Nowy sezon, nowy wygląd!");
  expect(buildFeedTitle("💙💙💙")).toBe("RKS Okęcie Warszawa");
});

test("slugifyTitle builds ascii slug with stable id suffix", () => {
  const slug = slugifyTitle(
    "🏕️💙 Obóz RKS Okęcie w Piszu dobiegł końca!",
    "1873075514017126_1872701620721182",
  );
  expect(slug).toBe("oboz-rks-okecie-w-piszu-dobiegl-konca-721182");
});

test("slugifyTitle falls back for empty content", () => {
  expect(slugifyTitle(undefined, "123_456789")).toBe("wpis-456789");
});
