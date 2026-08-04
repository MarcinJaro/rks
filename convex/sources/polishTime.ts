// Czas letni w UE: od ostatniej niedzieli marca 01:00 UTC
// do ostatniej niedzieli października 01:00 UTC.
function lastSundayUtc(year: number, month: number) {
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  const offsetToSunday = lastDay.getUTCDay();
  return Date.UTC(year, month, lastDay.getUTCDate() - offsetToSunday, 1, 0);
}

function isSummerTime(utcGuess: number, year: number) {
  return (
    utcGuess >= lastSundayUtc(year, 2) && utcGuess < lastSundayUtc(year, 9)
  );
}

export function polishDateToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
) {
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  // Przybliżenie wystarcza: granice zmiany czasu wypadają nocą,
  // a mecze nie są rozgrywane między 01:00 a 04:00.
  const offsetHours = isSummerTime(naive, year) ? 2 : 1;
  return naive - offsetHours * 60 * 60 * 1000;
}
