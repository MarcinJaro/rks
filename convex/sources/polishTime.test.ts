import { describe, expect, it } from "vitest";
import { polishDateToUtc } from "./polishTime";

describe("polishDateToUtc", () => {
  it("stosuje czas letni (UTC+2) w sierpniu", () => {
    expect(polishDateToUtc(2026, 8, 9, 11, 0)).toBe(
      Date.UTC(2026, 7, 9, 9, 0),
    );
  });

  it("stosuje czas zimowy (UTC+1) w listopadzie", () => {
    expect(polishDateToUtc(2026, 11, 15, 13, 30)).toBe(
      Date.UTC(2026, 10, 15, 12, 30),
    );
  });

  it("stosuje czas zimowy w marcu przed zmianą", () => {
    expect(polishDateToUtc(2027, 3, 14, 12, 0)).toBe(
      Date.UTC(2027, 2, 14, 11, 0),
    );
  });

  it("stosuje czas letni w kwietniu po zmianie", () => {
    expect(polishDateToUtc(2027, 4, 4, 11, 0)).toBe(
      Date.UTC(2027, 3, 4, 9, 0),
    );
  });
});
