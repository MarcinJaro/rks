/**
 * Zdjęcia grupowe z obozu letniego 2026 (przysłane przez klub 2026-08-28).
 * Roczniki 2013 i 2014 były na obozie razem i dzielą jedno zdjęcie.
 * Pliki generuje scripts/generate-camp-cards.mjs.
 */
export type CampPhoto = {
  src: string;
  width: number;
  height: number;
};

export const teamCampPhotos: Record<string, CampPhoto> = {
  "rocznik-2010": { src: "/images/teams/obozy/rocznik-2010.webp", width: 1600, height: 1200 },
  "rocznik-2012": { src: "/images/teams/obozy/rocznik-2012.webp", width: 1600, height: 1200 },
  "rocznik-2013": { src: "/images/teams/obozy/rocznik-2013.webp", width: 1600, height: 1200 },
  "rocznik-2014": { src: "/images/teams/obozy/rocznik-2014.webp", width: 1600, height: 1200 },
  "rocznik-2015": { src: "/images/teams/obozy/rocznik-2015.webp", width: 1200, height: 1600 },
  "rocznik-2016": { src: "/images/teams/obozy/rocznik-2016.webp", width: 1200, height: 1600 },
  "rocznik-2018": { src: "/images/teams/obozy/rocznik-2018.webp", width: 1200, height: 1600 },
};
