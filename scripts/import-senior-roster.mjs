// Bezpieczny, powtarzalny import kompletnej kadry seniorów do Convex.
// Użycie (cel jest obowiązkowy):
//   node scripts/import-senior-roster.mjs --deployment brazen-blackbird-144
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";

const deploymentFlagIndex = process.argv.indexOf("--deployment");
const deployment =
  deploymentFlagIndex >= 0 ? process.argv[deploymentFlagIndex + 1] : undefined;

if (!deployment || deployment.startsWith("-")) {
  throw new Error(
    "Podaj jawny cel: --deployment <nazwa>, np. --deployment brazen-blackbird-144",
  );
}

const roster = [
  ["Moatasem Aziz", "aziz-moatasem"],
  ["Krzysztof Bujak", "bujak-krzysztof"],
  ["Krzysztof Capar", "capar-krzysztof"],
  ["Dominik Dedek", "dedek-dominik"],
  ["Michał Dziubek", "dziubek-michal"],
  ["Hubert Ihnatowicz", "ihnatowicz-hubert"],
  ["Fabian Kaleta", "kaleta-fabian"],
  ["Kuba Kruszewski", "kruszewski-kuba"],
  ["Maksym Leski", "leski-maksym"],
  ["Mateusz Łuczak", "luczak-mateusz"],
  ["Mateusz Łuczyk", "luczyk-mateusz"],
  ["Bartłomiej Maciąg", "maciag-bartlomiej"],
  ["Konrad Miciński", "micinski-konrad"],
  ["Yauheni Novik", "novik-yauheni"],
  ["Paweł Olędzki", "oledzki-pawel"],
  ["Filip Przygoda", "przygoda-filip"],
  ["Mikołaj Rałowiec", "ralowiec-mikolaj"],
  ["Mateusz Rymarz", "rymarz-mateusz"],
  ["Adam Szklanko", "szklanko-adam"],
  ["Bartosz Szoja", "szoja-bartosz"],
  ["Szymon Ścięgosz", "sciegosz-szymon"],
  ["Konstantyn Ślęzak", "slezak-konstantyn"],
  ["Bartłomiej Warchoł", "warchol-bartlomiej"],
  ["Piotr Żuk", "zuk-piotr"],
].map(([name, file]) => ({
  name,
  path: `public/images/players/seniorzy/${file}.webp`,
}));

function convexRun(functionName, args = {}) {
  const stdout = execFileSync(
    "npx",
    [
      "convex",
      "run",
      functionName,
      JSON.stringify(args),
      "--deployment",
      deployment,
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
  );
  return JSON.parse(stdout.trim());
}

for (const player of roster) {
  if (!existsSync(player.path) || statSync(player.path).size === 0) {
    throw new Error(`Brak zdjęcia lub pusty plik: ${player.path}`);
  }
}

console.log(`Cel Convex: ${deployment}`);
const before = convexRun("publicDataImport:seniorRosterAudit");
console.log("Stan kadry przed importem:", before);
if (before.complete) {
  const defaults = convexRun("publicDataImport:syncSafePublicDefaults");
  console.log("Uzupełnienia ustawień i partnerów:", defaults);
  console.log("Kadra seniorów jest już kompletna — bez zmian.");
  process.exit(0);
}
if (before.existingCount > 0) {
  throw new Error(
    `Import przerwany: w drużynie seniorów jest już ${before.existingCount} rekordów. Niczego nie nadpisano.`,
  );
}
if (!before.teamFound) {
  throw new Error("Import przerwany: nie znaleziono drużyny seniorów.");
}

const defaults = convexRun("publicDataImport:syncSafePublicDefaults");
console.log("Uzupełnienia ustawień i partnerów:", defaults);

const uploadUrls = convexRun("seed:uploadUrls", { count: roster.length });
if (!Array.isArray(uploadUrls) || uploadUrls.length !== roster.length) {
  throw new Error("Convex nie zwrócił kompletu adresów do uploadu");
}

const uploadedStorageIds = [];
try {
  const players = [];
  for (const [index, player] of roster.entries()) {
    const response = await fetch(uploadUrls[index], {
      method: "POST",
      headers: { "Content-Type": "image/webp" },
      body: readFileSync(player.path),
    });
    if (!response.ok) {
      throw new Error(`Upload ${player.path} nie powiódł się: ${response.status}`);
    }
    const { storageId } = await response.json();
    if (typeof storageId !== "string" || storageId.length === 0) {
      throw new Error(`Upload ${player.path} nie zwrócił poprawnego storageId`);
    }
    uploadedStorageIds.push(storageId);
    players.push({ name: player.name, photoStorageId: storageId });
    console.log(`[${index + 1}/${roster.length}] ${player.name}`);
  }

  const result = convexRun("publicDataImport:importSeniorRoster", { players });
  console.log("Wynik importu:", result);
  if (!result.audit.complete) {
    throw new Error("Import zakończył się bez kompletnej kadry");
  }
} catch (error) {
  if (uploadedStorageIds.length > 0) {
    try {
      // Odpowiedź może zaginąć już po zatwierdzeniu mutacji. Backend sprawdza
      // więc referencje i usuwa wyłącznie pliki, które na pewno nie są
      // przypięte do żadnego zawodnika.
      const cleanup = convexRun(
        "publicDataImport:discardUnreferencedPlayerUploads",
        {
          storageIds: uploadedStorageIds,
        },
      );
      console.error(
        `Cleanup: usunięto ${cleanup.removed}, zachowano ${cleanup.preserved} używanych plików.`,
      );
    } catch (cleanupError) {
      console.error("Nie udało się automatycznie posprzątać uploadów:", cleanupError);
    }
  }
  throw error;
}

const after = convexRun("publicDataImport:seniorRosterAudit");
if (!after.complete || after.existingCount !== roster.length) {
  throw new Error(`Weryfikacja po imporcie nie powiodła się: ${JSON.stringify(after)}`);
}
console.log("Gotowe: 24/24 zawodników i 24/24 zdjęcia są w Convex.");
