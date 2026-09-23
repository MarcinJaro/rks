export type CropArea = { x: number; y: number; width: number; height: number };

/**
 * Wycina wskazany fragment zdjęcia (w pikselach oryginału) i zapisuje go
 * jako WebP. Dłuższy bok wyniku ograniczamy do maxEdge - karty osób na
 * stronie nie potrzebują więcej, a plik zostaje lekki.
 */
export async function cropImage(
  source: string,
  area: CropArea,
  maxEdge = 1250,
  quality = 0.86,
) {
  const image = await loadImage(source);
  const scale = Math.min(1, maxEdge / Math.max(area.width, area.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(area.width * scale));
  canvas.height = Math.max(1, Math.round(area.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Przeglądarka nie obsługuje przetwarzania zdjęć.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("Nie udało się przetworzyć zdjęcia.")),
      "image/webp",
      quality,
    ),
  );
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Nie udało się wczytać zdjęcia."));
    image.src = source;
  });
}
