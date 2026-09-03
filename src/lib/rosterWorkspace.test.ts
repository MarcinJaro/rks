import { describe, expect, it } from "vitest";

import {
  getRosterTeamGroup,
  matchesRosterSearch,
} from "./rosterWorkspace";

describe("getRosterTeamGroup", () => {
  it("dzieli drużyny seniorskie, akademię i oldboyów", () => {
    expect(
      getRosterTeamGroup({
        name: "Seniorzy II - B Klasa",
        slug: "seniorzy2",
      }),
    ).toBe("senior");
    expect(
      getRosterTeamGroup({
        name: "Rocznik 2016",
        slug: "rocznik-2016",
        yearGroup: 2016,
      }),
    ).toBe("academy");
    expect(
      getRosterTeamGroup({
        name: "Oldboy / Weterani",
        slug: "oldboy",
      }),
    ).toBe("veterans");
  });

  it("zostawia przyszłe, nieznane typy drużyn w pozostałych", () => {
    expect(
      getRosterTeamGroup({ name: "Sekcja kobieca", slug: "kobiety" }),
    ).toBe("other");
  });
});

describe("matchesRosterSearch", () => {
  const player = { name: "Michał Żołądkiewicz", number: "12" };

  it("wyszukuje nazwisko bez polskich znaków", () => {
    expect(matchesRosterSearch(player, "zoladkiewicz")).toBe(true);
  });

  it("wyszukuje po numerze", () => {
    expect(matchesRosterSearch(player, "12")).toBe(true);
  });

  it("nie zwraca zawodnika spoza zapytania", () => {
    expect(matchesRosterSearch(player, "Nowak")).toBe(false);
  });
});
