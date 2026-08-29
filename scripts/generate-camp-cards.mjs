// Zdjęcia grupowe ze zdjęć obozowych (lato 2026) na strony drużyn.
// Wejście: JPG-i od klienta (ścieżki w mapowaniu niżej). Wyjście:
//   public/images/teams/obozy/<slug>.webp  - pełne zdjęcie na stronę drużyny
// Kart w public/images/teams/ NIE dotykamy - klient zdecydował (2026-08-29),
// że siatka /druzyny zostaje na dotychczasowych grafikach.
// Użycie: node scripts/generate-camp-cards.mjs <katalog-ze-zdjeciami>
import { mkdir, writeFile } from "node:fs/promises";
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

const fullDir = path.join(root, "public/images/teams/obozy");
await mkdir(fullDir, { recursive: true });

for (const { file, slugs } of photoMap) {
  // .rotate() bez argumentu stosuje orientację EXIF (część zdjęć ma orient. 6).
  const upright = await sharp(path.join(sourceDir, file)).rotate().toBuffer();
  const meta = await sharp(upright).metadata();

  for (const slug of slugs) {
    const full = await sharp(upright)
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    await writeFile(path.join(fullDir, `${slug}.webp`), full);
    console.log(`${slug}: zdjęcie pełne (${meta.width}x${meta.height})`);
  }
}
