import { describe, expect, it } from "vitest";
import { parseRosterList } from "./rosterList";

describe("parseRosterList", () => {
  it("rozdziela numer od nazwiska", () => {
    expect(parseRosterList("10 Jan Kowalski")).toEqual([
      { number: "10", name: "Jan Kowalski" },
    ]);
  });

  it("akceptuje numer z kropką i z nawiasem", () => {
    expect(parseRosterList("7. Anna Nowak\n23) Piotr Zych")).toEqual([
      { number: "7", name: "Anna Nowak" },
      { number: "23", name: "Piotr Zych" },
    ]);
  });

  it("przyjmuje zawodnika bez numeru", () => {
    expect(parseRosterList("Karol Nguyen")).toEqual([
      { name: "Karol Nguyen" },
    ]);
  });

  it("pomija puste linie i białe znaki", () => {
    expect(parseRosterList("\n  1 Bartosz Golder  \n\n\n")).toEqual([
      { number: "1", name: "Bartosz Golder" },
    ]);
  });

  it("nie traktuje roku w nazwisku jako numeru koszulki", () => {
    // Numery mają najwyżej trzy cyfry - „2010" zostaje częścią nazwy.
    expect(parseRosterList("2010 Kowalski")).toEqual([
      { name: "2010 Kowalski" },
    ]);
  });

  it("odrzuca nagłówki i linie z samym numerem", () => {
    expect(
      parseRosterList("Bramkarze:\n10\nRocznik 2015\n7 Jan Kowalski"),
    ).toEqual([{ number: "7", name: "Jan Kowalski" }]);
  });

  it("odrzuca linie bez sensownej nazwy", () => {
    expect(parseRosterList("10 X\n-\n")).toEqual([]);
  });
});
