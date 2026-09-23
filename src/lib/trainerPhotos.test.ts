import { describe, expect, it } from "vitest";
import { personNameKey, trainerPhotoMap, withTrainerPhoto } from "./trainerPhotos";

describe("trainer photos", () => {
  it("matches names regardless of case, spacing and order", () => {
    expect(personNameKey("Artur  Bartosiński")).toBe(
      personNameKey("bartosiński artur"),
    );
  });

  it("prefers the panel photo over the static fallback", () => {
    const photos = trainerPhotoMap([
      { name: "Artur Bartosiński", photoUrl: "https://x.convex.cloud/a" },
    ]);
    expect(
      withTrainerPhoto({ name: "Artur Bartosiński" }, photos, "/legacy.jpg"),
    ).toBe("https://x.convex.cloud/a");
    expect(withTrainerPhoto({ name: "Piotr Pernal" }, photos, null)).toBeNull();
    expect(
      withTrainerPhoto({ name: "Maciej Kilman" }, photos, "/kilman.jpg"),
    ).toBe("/kilman.jpg");
  });
});
