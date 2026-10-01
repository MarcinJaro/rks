/**
 * Opis galerii z panelu jako osobne wiersze. Opisy bywają wklejane z innych
 * miejsc i zamiast nowych linii mają długie ciągi spacji (np. „górny rząd …
 *      Środkowy rząd …”) - traktujemy je jak podział wiersza.
 */
export function descriptionLines(text: string | null | undefined) {
  return (text ?? "")
    .split(/\r?\n|\s{3,}/)
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}
