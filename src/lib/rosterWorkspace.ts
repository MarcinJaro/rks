export type RosterTeamGroupKey =
  | "senior"
  | "academy"
  | "veterans"
  | "other";

export const rosterTeamGroups: {
  key: RosterTeamGroupKey;
  label: string;
}[] = [
  { key: "senior", label: "Drużyny seniorskie" },
  { key: "academy", label: "Akademia" },
  { key: "veterans", label: "Oldboye i weterani" },
  { key: "other", label: "Pozostałe" },
];

type TeamForRosterGroup = {
  name: string;
  slug: string;
  yearGroup?: number;
};

type PlayerForRosterSearch = {
  name: string;
  number?: string;
};

function normalizeRosterValue(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("pl-PL")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l");
}

export function getRosterTeamGroup(
  team: TeamForRosterGroup,
): RosterTeamGroupKey {
  const searchable = normalizeRosterValue(`${team.name} ${team.slug}`);

  if (team.yearGroup !== undefined || /\brocznik\b/.test(searchable)) {
    return "academy";
  }
  if (/\b(oldboy|weteran)/.test(searchable)) return "veterans";
  if (/\bsenior/.test(searchable)) return "senior";
  return "other";
}

export function matchesRosterSearch(
  player: PlayerForRosterSearch,
  search: string,
) {
  const query = normalizeRosterValue(search);
  if (!query) return true;

  return normalizeRosterValue(`${player.name} ${player.number ?? ""}`).includes(
    query,
  );
}
