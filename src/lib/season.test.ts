import { describe, expect, it } from "vitest";
import { recruitmentBirthYearThreshold, seasonStartYear } from "./season";

describe("seasonStartYear", () => {
  it("od lipca liczy nowy sezon", () => {
    expect(seasonStartYear(new Date("2026-07-01"))).toBe(2026);
    expect(seasonStartYear(new Date("2026-12-31"))).toBe(2026);
  });

  it("wiosną trwa jeszcze poprzedni sezon", () => {
    expect(seasonStartYear(new Date("2026-06-30"))).toBe(2025);
    expect(seasonStartYear(new Date("2026-01-15"))).toBe(2025);
  });
});

describe("recruitmentBirthYearThreshold", () => {
  it("odtwarza próg 2013 ze starej strony w sezonie 2025/26", () => {
    expect(recruitmentBirthYearThreshold(new Date("2026-05-01"))).toBe(2013);
  });

  it("w sezonie 2026/27 przesuwa próg na 2014", () => {
    expect(recruitmentBirthYearThreshold(new Date("2026-08-28"))).toBe(2014);
  });
});
