// Jednorazowy upload logotypów sponsorów i PDF-ów dokumentów do Convex
// storage + wpisy w tabelach (idempotentnie po nazwie/tytule).
// Użycie: node scripts/seed-files.mjs [--prod]
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const prodFlag = process.argv.includes("--prod") ? " --prod" : "";

function convexRun(fn, args) {
  const payload = args ? ` '${JSON.stringify(args)}'` : "";
  const out = execSync(`npx convex run ${fn}${payload}${prodFlag}`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const lines = out.trim().split("\n");
  return JSON.parse(lines.slice(lines.findIndex((l) => l.startsWith('"') || l.startsWith("{"))).join("\n"));
}

async function upload(path, mime) {
  const url = convexRun("seed:uploadUrl");
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": mime },
    body: readFileSync(path),
  });
  if (!response.ok) throw new Error(`Upload ${path} failed: ${response.status}`);
  const { storageId } = await response.json();
  console.log(`  wgrano ${path} -> ${storageId}`);
  return storageId;
}

const sponsors = [
  { name: "iParts", url: "https://www.iparts.pl", type: "sponsor", file: "public/images/partners/iparts.png", mime: "image/png" },
  { name: "NIW", type: "partner", file: "public/images/partners/niw.png", mime: "image/png" },
  { name: "Certyfikacja PZPN", type: "partner", file: "public/images/partners/pzpn-silver.png", mime: "image/png" },
  { name: "m.st. Warszawa", url: "https://um.warszawa.pl/", type: "partner", file: "public/images/partners/warszawa.jpg", mime: "image/jpeg" },
];

const documents = [
  { title: "Zgoda na pierwszy trening (Zawodnik Naborowy)", category: "Formularze", file: "public/documents/zgoda-pierwszy-trening.pdf" },
  { title: "Deklaracja gry amatora", category: "Formularze", file: "public/documents/deklaracja-gry-amatora.pdf" },
  { title: "Deklaracja członkowska", category: "Formularze", file: "public/documents/deklaracja-czlonkowska.pdf" },
  { title: "Statut klubu", category: "Dokumenty klubowe", file: "public/documents/statut.pdf" },
  { title: "Regulamin klubu", category: "Dokumenty klubowe", file: "public/documents/regulamin.pdf" },
  { title: "Polityka ochrony dzieci", category: "Dokumenty klubowe", file: "public/documents/polityka-ochrony-dzieci.pdf" },
];

console.log(`Cel: ${prodFlag ? "PROD" : "dev"}`);

console.log("Sponsorzy:");
const sponsorItems = [];
for (const { file, mime, ...rest } of sponsors) {
  sponsorItems.push({ ...rest, logoStorageId: await upload(file, mime) });
}
console.log(convexRun("seed:seedSponsors", { items: sponsorItems }));

console.log("Dokumenty:");
const documentItems = [];
for (const { file, ...rest } of documents) {
  documentItems.push({ ...rest, fileStorageId: await upload(file, "application/pdf") });
}
console.log(convexRun("seed:seedDocuments", { items: documentItems }));

console.log("Gotowe.");
