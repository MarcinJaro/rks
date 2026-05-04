import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const outDir = path.join(root, "public/images/teams");
const legacyBaseUrl = "https://rksokecie.pl";

const teams = [
  { name: "Seniorzy - Liga okręgowa", slug: "seniorzy", label: "Seniorzy", subtitle: "Liga okręgowa" },
  { name: "Seniorzy II - B Klasa", slug: "seniorzy2", label: "Seniorzy II", subtitle: "B Klasa" },
  { name: "Rocznik 2010", slug: "rocznik-2010", year: 2010, subtitle: "Akademia RKS Okęcie" },
  { name: "Rocznik 2012", slug: "rocznik-2012", year: 2012, subtitle: "Akademia RKS Okęcie" },
  { name: "Rocznik 2013", slug: "rocznik-2013", year: 2013, subtitle: "Akademia RKS Okęcie" },
  { name: "Rocznik 2014", slug: "rocznik-2014", year: 2014, subtitle: "Akademia RKS Okęcie" },
  { name: "Rocznik 2015", slug: "rocznik-2015", year: 2015, subtitle: "Akademia RKS Okęcie" },
  { name: "Rocznik 2016", slug: "rocznik-2016", year: 2016, subtitle: "Akademia RKS Okęcie" },
  { name: "Rocznik 2017", slug: "rocznik-2017", year: 2017, subtitle: "Akademia RKS Okęcie" },
  { name: "Rocznik 2018", slug: "rocznik-2018", year: 2018, subtitle: "Akademia RKS Okęcie" },
  { name: "Rocznik 2019", slug: "rocznik-2019", year: 2019, subtitle: "Akademia RKS Okęcie" },
  { name: "Rocznik 2020 i młodsi", slug: "rocznik-2020", year: 2020, suffix: "+", subtitle: "Akademia RKS Okęcie" },
  { name: "Oldboy / Weterani", slug: "oldboy", label: "Oldboy", subtitle: "RKS Okęcie" },
];

const genericImages = {
  seniorzy: "public/images/figma/team-seniors.png",
  seniorzy2: "public/images/figma/team-seniors.png",
  oldboy: "public/images/figma/team-seniors.png",
  youth: "public/images/figma/team-2010.png",
  children: "public/images/figma/team-2014.png",
};

await mkdir(outDir, { recursive: true });

for (const team of teams) {
  const photo = await getTeamPhoto(team);
  const poster = await composePoster(team, photo);
  const outPath = path.join(outDir, `${team.slug}.webp`);
  await writeFile(outPath, poster);
  console.log(`generated ${path.relative(root, outPath)} (${photo.kind})`);
}

async function getTeamPhoto(team) {
  const legacyPhoto = await getLegacyPhoto(team.slug);

  if (legacyPhoto) {
    return { kind: "legacy", buffer: legacyPhoto };
  }

  const fallback =
    team.year && team.year >= 2014
      ? genericImages.children
      : team.year
        ? genericImages.youth
        : genericImages[team.slug] || genericImages.seniorzy;

  return {
    kind: "generic",
    buffer: await readFile(path.join(root, fallback)),
  };
}

async function getLegacyPhoto(slug) {
  try {
    const html = await fetch(`${legacyBaseUrl}/${slug}`).then((response) =>
      response.ok ? response.text() : "",
    );
    const matches = [
      ...html.matchAll(
        /views-field-field-pil-foto[\s\S]*?<img\b[^>]*src="([^"]*)"[^>]*>/g,
      ),
    ]
      .map((match) => match[1].replaceAll("&amp;", "&"))
      .filter((src) => !src.includes("default_images"));

    if (matches.length === 0) return null;

    const index = Math.min(matches.length - 1, Math.max(0, Math.floor(matches.length / 3)));
    const url = new URL(matches[index], legacyBaseUrl).toString();
    const response = await fetch(url);

    if (!response.ok) return null;

    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

async function composePoster(team, photo) {
  const width = 1144;
  const height = 1600;
  const crest = await readFile(path.join(root, "public/images/figma/crest-rks.png"));
  const title = team.year ? `${team.year}${team.suffix || ""}` : team.label.toUpperCase();
  const eyebrow = team.year ? "ROCZNIK" : "DRUŻYNA";
  const subtitle = team.subtitle.toUpperCase();

  const baseImage = sharp(photo.buffer)
    .resize(width, height, { fit: "cover", position: "top" })
    .modulate({ brightness: 0.78, saturation: 1.05 })
    .linear(1.08, -10);
  const base = await (photo.kind === "generic" ? baseImage.blur(0.4) : baseImage).toBuffer();

  const crestBuffer = await sharp(crest)
    .resize(520, 520, { fit: "contain" })
    .modulate({ brightness: 0.55, saturation: 0.5 })
    .png()
    .toBuffer();

  return sharp(base)
    .composite([
      { input: Buffer.from(overlaySvg(width, height)), blend: "over" },
      { input: crestBuffer, left: 42, top: 54, blend: "screen" },
      { input: Buffer.from(textSvg(width, height, eyebrow, title, subtitle)), blend: "over" },
    ])
    .webp({ quality: 88 })
    .toBuffer();
}

function overlaySvg(width, height) {
  return `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grade" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#050913" stop-opacity=".74"/>
        <stop offset=".46" stop-color="#07101f" stop-opacity=".2"/>
        <stop offset="1" stop-color="#020617" stop-opacity=".96"/>
      </linearGradient>
      <linearGradient id="bottom" x1="0" y1=".35" x2="0" y2="1">
        <stop offset="0" stop-color="#020617" stop-opacity="0"/>
        <stop offset=".72" stop-color="#020617" stop-opacity=".82"/>
        <stop offset="1" stop-color="#020617" stop-opacity=".98"/>
      </linearGradient>
      <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
        <circle cx="4" cy="4" r="2.1" fill="#d8ff3e" opacity=".78"/>
      </pattern>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#grade)"/>
    <rect width="${width}" height="${height}" fill="url(#bottom)"/>
    <rect x="22" y="20" width="${width - 44}" height="${height - 42}" rx="24" fill="none" stroke="#d7e6ff" stroke-opacity=".42" stroke-width="1.5"/>
    <rect x="42" y="748" width="104" height="332" fill="url(#dots)" opacity=".72"/>
    <g fill="none" stroke="#7bafff" stroke-opacity=".46" stroke-width="2">
      <path d="M780 42 L1056 110 L1015 348 L892 316 Z"/>
      <path d="M770 875 C930 760 1056 820 1110 998"/>
      <path d="M826 902 C860 932 900 942 950 930"/>
      <path d="M840 1300 L1030 1370 L960 1548 L760 1480 Z"/>
      <circle cx="858" cy="245" r="98" stroke-dasharray="8 9"/>
      <path d="M906 0 L828 535" stroke-dasharray="8 10"/>
    </g>
    <g stroke="#f3f7ff" stroke-opacity=".9" stroke-width="3">
      <path d="M826 372 l16 16 M842 372 l-16 16"/>
      <path d="M900 488 l16 16 M916 488 l-16 16"/>
      <path d="M982 520 l16 16 M998 520 l-16 16"/>
    </g>
    <circle cx="870" cy="260" r="8" fill="none" stroke="#7bafff" stroke-width="3"/>
    <circle cx="962" cy="1450" r="5" fill="#7bafff" opacity=".45"/>
  </svg>`;
}

function textSvg(width, height, eyebrow, title, subtitle) {
  const isLong = title.length > 8;
  const titleSize = isLong ? 118 : title.length > 4 ? 188 : 232;
  const titleY = isLong ? 1290 : 1334;

  return `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <style>
      .eyebrow{font:900 76px Arial Black, Impact, sans-serif;letter-spacing:-1px;fill:#d8ff3e;transform:skewX(-8deg)}
      .title{font:900 ${titleSize}px Arial Black, Impact, sans-serif;letter-spacing:-5px;fill:#f3f7ff;transform:skewX(-8deg)}
      .subtitle{font:800 46px Arial, sans-serif;letter-spacing:8px;fill:#d8ff3e}
      .muted{fill:#9fb0cc}
    </style>
    <text x="96" y="1160" class="eyebrow">${escapeXml(eyebrow)}</text>
    <text x="86" y="${titleY}" class="title">${escapeXml(title)}</text>
    <text x="104" y="1432" class="subtitle"><tspan class="muted">${escapeXml(subtitle.replace("RKS OKĘCIE", ""))}</tspan>${subtitle.includes("RKS OKĘCIE") ? " RKS OKĘCIE" : ""}</text>
    <path d="M104 1464 H300" stroke="#d8ff3e" stroke-width="10"/>
    <path d="M104 1482 H260" stroke="#7bafff" stroke-opacity=".5" stroke-width="2"/>
  </svg>`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
