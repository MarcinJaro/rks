// Karty drużyn i zdjęcia grupowe ze zdjęć obozowych (lato 2026).
// Wejście: JPG-i od klienta (ścieżki w mapowaniu niżej). Wyjście:
//   public/images/teams/<slug>.webp        - karta 1144x1600 w stylu dotychczasowych
//   public/images/teams/obozy/<slug>.webp  - pełne zdjęcie na stronę drużyny
// Użycie: node scripts/generate-camp-cards.mjs <katalog-ze-zdjeciami>
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const sourceDir = process.argv[2];
if (!sourceDir) {
  console.error("Użycie: node scripts/generate-camp-cards.mjs <katalog-ze-zdjeciami>");
  process.exit(1);
}

// Jedno zdjęcie może obsługiwać kilka roczników (2013 i 2014 były na obozie razem).
const photoMap = [
  { file: "09cf06c8-4999-4afb-b0d6-8680ee5ceeda-bed9a473-8330-4773-bb1f-e92e24e46185.jpg", slugs: ["rocznik-2010"] },
  { file: "09cf06c8-4999-4afb-b0d6-8680ee5ceeda-71bb343d-3d6c-4287-85c7-5cb50915694e.jpg", slugs: ["rocznik-2012"] },
  { file: "09cf06c8-4999-4afb-b0d6-8680ee5ceeda-667ab7e4-f358-4898-adf5-80bb25494a7c.jpg", slugs: ["rocznik-2013", "rocznik-2014"] },
  { file: "09cf06c8-4999-4afb-b0d6-8680ee5ceeda-d5e54194-e15b-40d2-8e9c-00048a67736c.jpg", slugs: ["rocznik-2015"] },
  { file: "09cf06c8-4999-4afb-b0d6-8680ee5ceeda-82706acb-7290-4db4-8c68-69ed7e014905.jpg", slugs: ["rocznik-2016"] },
  { file: "09cf06c8-4999-4afb-b0d6-8680ee5ceeda-fba08031-ba23-43cc-ab33-f0a89615aec8.jpg", slugs: ["rocznik-2018"] },
];

const cardsDir = path.join(root, "public/images/teams");
const fullDir = path.join(root, "public/images/teams/obozy");
await mkdir(fullDir, { recursive: true });

for (const { file, slugs } of photoMap) {
  // .rotate() bez argumentu stosuje orientację EXIF (część zdjęć ma orient. 6).
  const upright = await sharp(path.join(sourceDir, file)).rotate().toBuffer();
  const meta = await sharp(upright).metadata();

  for (const slug of slugs) {
    const year = slug.replace("rocznik-", "");
    const card = await composeCard(upright, year);
    await writeFile(path.join(cardsDir, `${slug}.webp`), card);

    const full = await sharp(upright)
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    await writeFile(path.join(fullDir, `${slug}.webp`), full);
    console.log(`${slug}: karta + zdjęcie pełne (${meta.width}x${meta.height})`);
  }
}

async function composeCard(photo, year) {
  const width = 1144;
  const height = 1600;

  // Wszystkie zdjęcia mają dużo nieba u góry, a dolna 1/3 karty jest zajęta
  // przez gradient i napisy - ścinamy 15% z góry, żeby twarze dolnego rzędu
  // nie wpadały pod tekst.
  const meta = await sharp(photo).metadata();
  const topCrop = Math.round(meta.height * 0.15);
  const trimmed = await sharp(photo)
    .extract({ left: 0, top: topCrop, width: meta.width, height: meta.height - topCrop })
    .toBuffer();

  // Poziome zdjęcia grupowe: "attention" celuje w skupisko twarzy zamiast
  // sztywnego środka; pionowe i tak prawie nie są przycinane.
  const base = await sharp(trimmed)
    .resize(width, height, { fit: "cover", position: sharp.strategy.attention })
    .modulate({ brightness: 0.82, saturation: 1.05 })
    .linear(1.06, -8)
    .toBuffer();

  const crest = await readFile(path.join(root, "public/images/figma/crest-rks.png"));
  // Na jasnym niebie watermark w trybie screen robi się nachalny - mocno go
  // przygaszamy, żeby został delikatnym znakiem wodnym jak na starych kartach.
  const crestBuffer = await sharp(crest)
    .resize(520, 520, { fit: "contain" })
    .modulate({ brightness: 0.28, saturation: 0.4 })
    .png()
    .toBuffer();

  return sharp(base)
    .composite([
      { input: Buffer.from(overlaySvg(width, height)), blend: "over" },
      { input: crestBuffer, left: 42, top: 54, blend: "screen" },
      { input: Buffer.from(textSvg(width, height, year)), blend: "over" },
    ])
    .webp({ quality: 88 })
    .toBuffer();
}

function overlaySvg(width, height) {
  return `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grade" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#050913" stop-opacity=".5"/>
        <stop offset=".46" stop-color="#07101f" stop-opacity=".08"/>
        <stop offset="1" stop-color="#020617" stop-opacity=".9"/>
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
  </svg>`;
}

function textSvg(width, height, year) {
  // Skew nakładamy przez grupę z translate, bo librsvg liczy skewX względem
  // punktu (0,0) całego SVG i tekst uciekałby poza lewą krawędź.
  return `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <style>
      .eyebrow{font:900 76px Arial Black, Impact, sans-serif;letter-spacing:-1px;fill:#d8ff3e}
      .title{font:900 188px Arial Black, Impact, sans-serif;letter-spacing:-5px;fill:#f3f7ff}
      .subtitle{font:800 46px Arial, sans-serif;letter-spacing:8px;fill:#d8ff3e}
      .muted{fill:#9fb0cc}
    </style>
    <g transform="translate(96 1160) skewX(-8)"><text class="eyebrow">ROCZNIK</text></g>
    <g transform="translate(86 1334) skewX(-8)"><text class="title">${year}</text></g>
    <text x="104" y="1432" class="subtitle muted">AKADEMIA</text>
    <text x="452" y="1432" class="subtitle">RKS OKĘCIE</text>
    <path d="M104 1464 H300" stroke="#d8ff3e" stroke-width="10"/>
    <path d="M104 1482 H260" stroke="#7bafff" stroke-opacity=".5" stroke-width="2"/>
  </svg>`;
}
