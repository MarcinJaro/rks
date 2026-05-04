const LEGACY_BASE_URL = "https://rksokecie.pl";

const LEGACY_TEAM_SLUGS = new Set([
  "seniorzy",
  "seniorzy2",
  "rocznik-2010",
  "rocznik-2012",
  "rocznik-2013",
  "rocznik-2014",
  "rocznik-2015",
  "rocznik-2016",
  "rocznik-2017",
  "rocznik-2018",
  "rocznik-2019",
  "rocznik-2020",
  "oldboy",
]);

export type RosterPerson = {
  name: string;
  number?: string;
  photoUrl?: string;
};

export type TeamRoster = {
  players: RosterPerson[];
  coaches: RosterPerson[];
  sourceUrl: string;
};

export async function getLegacyRoster(
  slug: string,
): Promise<TeamRoster | null> {
  if (!LEGACY_TEAM_SLUGS.has(slug)) return null;

  const sourceUrl = `${LEGACY_BASE_URL}/${slug}`;

  try {
    const response = await fetch(sourceUrl, {
      next: { revalidate: 60 * 60 * 12 },
    });

    if (!response.ok) return null;

    const html = await response.text();
    const players = extractRosterPeople(html, "field-pil-foto", true);
    const coaches = extractRosterPeople(html, "field-tr-foto", false);

    if (players.length === 0 && coaches.length === 0) return null;

    return { players, coaches, sourceUrl };
  } catch {
    return null;
  }
}

function extractRosterPeople(
  html: string,
  imageField: string,
  splitNumber: boolean,
): RosterPerson[] {
  const pattern = new RegExp(
    `views-field-${imageField}[\\s\\S]*?<img\\b([^>]*)>[\\s\\S]*?views-field-title[\\s\\S]*?(?:<a[^>]*>|<span[^>]*>)(.*?)(?:<\\/a>|<\\/span>)`,
    "g",
  );

  return [...html.matchAll(pattern)]
    .map((match) => {
      const imageAttributes = match[1] ?? "";
      const rawName = decodeHtml(stripTags(match[2] ?? ""));
      const { number, name } = splitNumber
        ? splitPlayerNumber(rawName)
        : { number: undefined, name: rawName };
      const photoUrl = normalizePhotoUrl(getAttribute(imageAttributes, "src"));

      return {
        name: humanizeName(name),
        number,
        photoUrl,
      };
    })
    .filter((person) => person.name.length > 0);
}

function splitPlayerNumber(rawName: string) {
  const normalized = rawName.replace(/\s+/g, " ").trim();
  const match = normalized.match(/^(\d+)[.,]?\s*(.+)$/);

  if (!match) return { name: normalized, number: undefined };

  return { name: match[2].trim(), number: match[1] };
}

function getAttribute(attributes: string, name: string) {
  const match = attributes.match(new RegExp(`${name}="([^"]*)"`));
  return match ? decodeHtml(match[1]) : undefined;
}

function normalizePhotoUrl(src?: string) {
  if (!src || src.includes("default_images")) return undefined;

  return new URL(src, LEGACY_BASE_URL).toString();
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function humanizeName(name: string) {
  const normalized = name.replace(/\s+/g, " ").trim();

  if (/[a-ząćęłńóśźż]/.test(normalized)) return normalized;

  return normalized
    .toLocaleLowerCase("pl-PL")
    .split(/([ -])/)
    .map((part) =>
      part.length > 1 ? `${part[0].toLocaleUpperCase("pl-PL")}${part.slice(1)}` : part,
    )
    .join("");
}
