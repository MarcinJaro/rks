import type { MetadataRoute } from "next";
import { teams } from "@/data/site";

const baseUrl = "https://rksokecie.pl";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/aktualnosci",
    "/druzyny",
    "/klub/historia",
    "/klub/zarzad",
    "/klub/sztab",
    "/klub/certyfikacja-pzpn",
    "/klub/stadion",
    "/klub/dokumenty",
    "/klub/niw-crso",
    "/kibice/historia",
    "/kibice/galeria",
    "/kibice/spiewnik",
    "/zawodnik",
    "/zawodnik/stroje",
    "/zawodnik/treningi-bramkarskie",
    "/zawodnik/treningi-indywidualne",
    "/zawodnik/oplaty",
    "/zawodnik/regulamin",
    "/wspieraj",
    "/kontakt",
    "/wyniki",
    "/galeria",
    "/polityka-prywatnosci",
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
    })),
    ...teams.map((team) => ({
      url: `${baseUrl}/druzyny/${team.slug}`,
      lastModified: new Date(),
    })),
  ];
}
