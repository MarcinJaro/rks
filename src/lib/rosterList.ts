export type ParsedRosterEntry = {
  name: string;
  number?: string;
};

/**
 * Zamienia wklejoną listę kadry na wpisy dla panelu. Jedna linia to jeden
 * zawodnik; wiodący numer (z opcjonalną kropką lub nawiasem) jest traktowany
 * jako numer na koszulce, reszta linii jako imię i nazwisko.
 */
export function parseRosterList(input: string): ParsedRosterEntry[] {
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line): ParsedRosterEntry => {
      const match = line.match(/^(\d{1,3})[.)]?\s+(.+)$/);
      if (match) return { number: match[1], name: match[2].trim() };
      return { name: line };
    })
    // Nazwa musi mieć ≥2 znaki i zawierać literę - odrzuca nagłówki
    // ("Bramkarze:", "Rocznik 2015") i osierocone numery bez nazwiska.
    .filter(
      (entry) =>
        entry.name.length >= 2 &&
        /\p{L}/u.test(entry.name) &&
        !entry.name.endsWith(":") &&
        // Typowe nagłówki grup wklejane razem z listą.
        !/^rocznik\b/i.test(entry.name),
    );
}
