/**
 * Sezon piłkarski zaczyna się 1 lipca - w sierpniu 2026 trwa sezon 2026/27.
 */
export function seasonStartYear(now: Date = new Date()): number {
  const year = now.getFullYear();

  return now.getMonth() >= 6 ? year : year - 1;
}

/**
 * Rocznik graniczny dla formalności naborowych ("dotyczy dzieci ur. X
 * i młodszych"). Stara strona podawała 2013 w sezonie 2025/26 - próg
 * przesuwa się o rok z każdym sezonem, więc liczymy go zamiast wpisywać
 * na sztywno i aktualizować co roku ręcznie.
 */
export function recruitmentBirthYearThreshold(now: Date = new Date()): number {
  return seasonStartYear(now) - 12;
}
