import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    // Panel wymaga ADMIN_EMAILS - testy jadą jako admin z tej listy.
    env: { ADMIN_EMAILS: "admin@rksokecie.pl" },
    server: { deps: { inline: ["convex-test"] } },
  },
});
