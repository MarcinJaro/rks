export async function prepareArticleImage(
  file: File,
  maxEdge = 2000,
  quality = 0.82,
) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Wybierz zdjęcie JPG, PNG lub WebP.");
  if (file.size > 30 * 1024 * 1024)
    throw new Error("Maksymalny rozmiar zdjęcia to 30 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 80_000_000)
      throw new Error(
        "Zdjęcie ma zbyt dużą rozdzielczość (maks. 80 megapikseli).",
      );
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx)
      throw new Error("Przeglądarka nie obsługuje przetwarzania zdjęć.");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b
            ? resolve(b)
            : reject(new Error("Nie udało się przetworzyć zdjęcia.")),
        "image/webp",
        quality,
      ),
    );
    // Keep a smaller original only if it already fits the chosen dimensions.
    return {
      blob: scale === 1 && file.size < blob.size ? file : blob,
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    bitmap.close();
  }
}
