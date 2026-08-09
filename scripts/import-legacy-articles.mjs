// Import artykułów sezonu 2025/26 ze starego Drupala (rksokecie.pl) do Convex.
// Wejście: JSON ze scrapera ({path,date,team,thumb,title,bodyHtml,gallery}[]).
// Użycie: node scripts/import-legacy-articles.mjs <articles.json> [--prod]
// Idempotentny: slugi już obecne w tabeli articles są pomijane przed uploadem.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const OLD_BASE = "https://rksokecie.pl";
const GALLERY_CAP = 16;
const TEAM_SLUGS = { "Seniorzy - Liga okręgowa": "seniorzy" };

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error("Użycie: node scripts/import-legacy-articles.mjs <articles.json> [--prod]");
  process.exit(1);
}
const prodFlag = process.argv.includes("--prod") ? " --prod" : "";

function convexRun(fn, args) {
  const payload = args ? ` '${JSON.stringify(args).replaceAll("'", "'\\''")}'` : "";
  const out = execSync(`npx convex run ${fn}${payload}${prodFlag}`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
  const lines = out.trim().split("\n");
  const start = lines.findIndex(
    (l) => l.startsWith('"') || l.startsWith("{") || l.startsWith("["),
  );
  return JSON.parse(lines.slice(start).join("\n"));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Stary hosting zrywa czasem TLS w trakcie transferu — ponawiamy.
async function withRetry(fn, label) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= 4) throw err;
      console.error(`    retry ${attempt} (${label}): ${err.message}`);
      await sleep(1500 * attempt);
    }
  }
}

async function download(url) {
  return await withRetry(async () => {
    const res = await fetch(url, {
      headers: { "User-Agent": "RKS-migracja/1.0 (kontakt: marcin@creativerebels.pl)" },
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const mime = res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
    if (!mime.startsWith("image/")) throw new Error(`nie-obrazek: ${mime}`);
    return { body: Buffer.from(await res.arrayBuffer()), mime };
  }, url);
}

// Pobiera obrazki i wgrywa je do Convex storage. Zwraca storageId per URL
// (null gdy pobranie się nie powiodło).
async function uploadImages(urls) {
  const files = [];
  for (const url of urls) {
    try {
      files.push({ url, ...(await download(url)) });
    } catch (err) {
      console.error(`    obrazek pominięty (${err.message}): ${url}`);
      files.push({ url, body: null });
    }
  }
  const present = files.filter((f) => f.body);
  if (present.length === 0) return new Map(files.map((f) => [f.url, null]));
  const uploadTargets = convexRun("seed:uploadUrls", { count: present.length });
  await Promise.all(
    present.map(async (file, i) => {
      const json = await withRetry(async () => {
        const res = await fetch(uploadTargets[i], {
          method: "POST",
          headers: { "Content-Type": file.mime },
          body: file.body,
        });
        if (!res.ok) throw new Error(`${res.status}`);
        return await res.json();
      }, `upload ${file.url}`);
      file.storageId = json.storageId;
    }),
  );
  return new Map(files.map((f) => [f.url, f.storageId ?? null]));
}

const decode = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

function sanitizeHtml(raw) {
  let html = raw
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "");
  // Atrybuty: zostają tylko href (a) i src+alt (img).
  html = html.replace(/<a\b[^>]*?href="([^"]*)"[^>]*>/gi, '<a href="$1">');
  html = html.replace(/<img\b[^>]*?src="([^"]*)"[^>]*?(?:alt="([^"]*)")?[^>]*\/?>/gi, (m, src, alt) => `<img src="${src}" alt="${alt || ""}" />`);
  html = html.replace(/<(?!\/|a\b|img\b)([a-z][a-z0-9]*)\b[^>]*>/gi, "<$1>");
  // Puste akapity po Drupalu.
  html = html.replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, "");
  return html.trim();
}

const toText = (html) =>
  decode(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

const absolutize = (src) => (src.startsWith("/") ? OLD_BASE + src : src);
// Miniatura z listingu to pochodna stylu Drupala — oryginał bez /styles/.../public.
const originalOf = (styledUrl) =>
  styledUrl.replace(/\/styles\/[^/]+\/public\//, "/").replace(/\?.*$/, "");

const rawArticles = JSON.parse(readFileSync(jsonPath, "utf8"));
console.log(`Cel: ${prodFlag ? "PROD" : "dev"}; artykułów w pliku: ${rawArticles.length}`);

const existing = new Set(convexRun("seed:existingArticleSlugs"));
const pending = rawArticles.filter(
  (a) => !existing.has(a.path.split("/").pop()),
);
console.log(`Do importu (bez już istniejących slugów): ${pending.length}`);

const items = [];
const totals = { inserted: 0, skipped: 0, slugConflicts: [] };
for (const raw of pending) {
  const slug = raw.path.split("/").pop();
  console.log(`- ${raw.date} ${slug}`);
  let contentHtml = sanitizeHtml(raw.bodyHtml);

  const inlineSrcs = [
    ...new Set(
      [...contentHtml.matchAll(/<img src="([^"]+)"/g)].map((m) => m[1]),
    ),
  ];
  const gallery = raw.gallery.slice(0, GALLERY_CAP);
  if (raw.gallery.length > gallery.length) {
    console.log(`    galeria przycięta: ${raw.gallery.length} -> ${gallery.length}`);
  }
  const heroCandidates = raw.thumb
    ? [originalOf(raw.thumb), raw.thumb]
    : gallery.slice(0, 1);

  const toUpload = [
    ...new Set([
      ...heroCandidates.slice(0, 1),
      ...inlineSrcs.map(absolutize),
      ...gallery,
    ]),
  ];
  const uploaded = await uploadImages(toUpload);

  // Hero: oryginał, a gdy się nie pobrał — wariant stylowany z listingu.
  let heroId = uploaded.get(heroCandidates[0]) ?? null;
  if (!heroId && heroCandidates[1]) {
    heroId = (await uploadImages([heroCandidates[1]])).get(heroCandidates[1]);
  }

  // Inline: podmiana src na URL-e z Convex storage; nieudane znikają z treści.
  const inlineIds = inlineSrcs
    .map((src) => uploaded.get(absolutize(src)))
    .filter(Boolean);
  const inlineUrls = inlineIds.length
    ? convexRun("seed:storageUrls", { ids: inlineIds })
    : [];
  let urlIndex = 0;
  for (const src of inlineSrcs) {
    const id = uploaded.get(absolutize(src));
    if (id) {
      contentHtml = contentHtml.replaceAll(
        `<img src="${src}"`,
        `<img src="${inlineUrls[urlIndex++]}"`,
      );
    } else {
      contentHtml = contentHtml.replace(
        new RegExp(`<img src="${src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*/>`, "g"),
        "",
      );
    }
  }

  const galleryIds = gallery
    .map((url) => uploaded.get(url))
    .filter((id) => Boolean(id) && id !== heroId);

  const content = toText(contentHtml);
  const item = {
    title: raw.title,
    slug,
    content,
    contentHtml,
    excerpt: content.slice(0, 200).replace(/\s+\S*$/, "") || undefined,
    publishedAt: Date.parse(`${raw.date}T12:00:00Z`),
    teamSlug: raw.team ? TEAM_SLUGS[raw.team] : undefined,
    imageStorageId: heroId || undefined,
    galleryIds: galleryIds.length ? galleryIds : undefined,
  };

  // Zapis od razu — przerwany bieg można wznowić bez ponownych uploadów
  // (istniejące slugi odpadają na starcie).
  const result = convexRun("seed:seedArticles", { items: [item] });
  items.push(item);
  totals.inserted += result.inserted;
  totals.skipped += result.skipped;
  totals.slugConflicts.push(...result.slugConflicts);
}

console.log(totals);
console.log("Gotowe.");
