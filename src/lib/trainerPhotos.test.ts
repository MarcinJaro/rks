import { describe, expect, it } from "vitest";
import {
  displayPersonName,
  mergeTeamCoaches,
  panelOnlyTrainers,
  personNameKey,
  trainerPhotoMap,
  withTrainerPhoto,
  type PanelTrainer,
} from "./trainerPhotos";

function trainer(fields: Partial<PanelTrainer> & { name: string }): PanelTrainer {
  return {
    position: null,
    phone: null,
    email: null,
    teamSlug: null,
    teamName: null,
    photoUrl: null,
    ...fields,
  };
}

describe("trainer photos", () => {
  it("matches names regardless of case, spacing and order", () => {
    expect(personNameKey("Artur  Bartosiński")).toBe(
      personNameKey("bartosiński artur"),
    );
  });

  it("prefers the panel photo over the static fallback", () => {
    const photos = trainerPhotoMap([
      { name: "Artur Bartosiński", photoUrl: "https://x.convex.cloud/a" },
      { name: "Piotr Pernal", photoUrl: null },
    ]);
    expect(
      withTrainerPhoto({ name: "Artur Bartosiński" }, photos, "/legacy.jpg"),
    ).toBe("https://x.convex.cloud/a");
    expect(withTrainerPhoto({ name: "Piotr Pernal" }, photos, null)).toBeNull();
    expect(
      withTrainerPhoto({ name: "Maciej Kilman" }, photos, "/kilman.jpg"),
    ).toBe("/kilman.jpg");
  });

  it("matches a panel photo stored under an alias spelling", () => {
    const photos = trainerPhotoMap([
      { name: "PAVEL  PYTKO", photoUrl: "https://x.convex.cloud/p" },
    ]);
    expect(
      withTrainerPhoto(
        { name: "Pavlo Pytko", aliases: ["Pavel Pytko"] },
        photos,
        null,
      ),
    ).toBe("https://x.convex.cloud/p");
  });
});

describe("panel trainers on the site", () => {
  it("title-cases names typed in capitals", () => {
    expect(displayPersonName("ARTUR  SYBIS-KAŁUSKI")).toBe("Artur Sybis-Kałuski");
    expect(displayPersonName("Mateusz Łuczyk")).toBe("Mateusz Łuczyk");
  });

  it("adds panel-only trainers once, with all their teams", () => {
    const extra = panelOnlyTrainers(
      [
        trainer({ name: "PAVEL PYTKO", teamSlug: "rocznik-2017", teamName: "Rocznik 2017" }),
        trainer({
          name: "ARTUR  SYBIS-KAŁUSKI",
          position: "Kierownik 2 zespołu seniorów",
          teamSlug: "seniorzy2",
          teamName: "Seniorzy II - B Klasa",
        }),
        trainer({ name: "Artur Sybis-Kałuski", teamSlug: "oldboy", teamName: "Oldboy" }),
      ],
      [{ name: "Pavlo Pytko", aliases: ["Pavel Pytko"] }],
    );
    expect(extra).toEqual([
      {
        name: "Artur Sybis-Kałuski",
        position: "Kierownik 2 zespołu seniorów",
        phone: null,
        email: null,
        photoUrl: null,
        teams: [
          { slug: "seniorzy2", name: "Seniorzy II - B Klasa" },
          { slug: "oldboy", name: "Oldboy" },
        ],
      },
    ]);
  });

  it("merges a team's static staff with trainers assigned in the panel", () => {
    const trainers = [
      trainer({ name: "TOMASZ  PĘŚKO", teamSlug: "seniorzy2", photoUrl: "https://x/t" }),
      trainer({
        name: "ARTUR  SYBIS-KAŁUSKI",
        position: "Kierownik 2 zespołu seniorów",
        teamSlug: "seniorzy2",
        photoUrl: "https://x/a",
      }),
      trainer({ name: "MACIEJ KILMAN", teamSlug: "seniorzy2" }),
      trainer({ name: "KAROL KUZA", teamSlug: "rocznik-2014" }),
    ];
    const known = [
      { name: "Tomasz Pęśko", photo: "/pesko.jpg" },
      { name: "Maciej Kilman", photo: "/kilman.jpg" },
      { name: "Karol Kuza", photo: null },
    ];
    expect(
      mergeTeamCoaches(
        "seniorzy2",
        [{ name: "Tomasz Pęśko", photoUrl: "/pesko.jpg" }],
        known,
        trainers,
      ),
    ).toEqual([
      { name: "Tomasz Pęśko", photoUrl: "https://x/t" },
      {
        name: "Artur Sybis-Kałuski",
        photoUrl: "https://x/a",
        position: "Kierownik 2 zespołu seniorów",
      },
      { name: "Maciej Kilman", photoUrl: "/kilman.jpg" },
    ]);
  });

  it("keeps the static staff while the panel is loading", () => {
    expect(
      mergeTeamCoaches("seniorzy", [{ name: "Piotr Pernal" }], [], undefined),
    ).toEqual([{ name: "Piotr Pernal", photoUrl: null }]);
  });
});
