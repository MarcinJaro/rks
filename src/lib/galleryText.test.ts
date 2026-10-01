import { describe, expect, it } from "vitest";
import { descriptionLines } from "./galleryText";

describe("descriptionLines", () => {
  it("splits pasted descriptions on newlines and long space runs", () => {
    expect(
      descriptionLines(
        "Górny rząd: A, B             Środkowy rząd:  C\nDolny rząd: D  ",
      ),
    ).toEqual(["Górny rząd: A, B", "Środkowy rząd: C", "Dolny rząd: D"]);
  });

  it("returns nothing for an empty description", () => {
    expect(descriptionLines(null)).toEqual([]);
    expect(descriptionLines("   ")).toEqual([]);
  });
});
