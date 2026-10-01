/**
 * Klucz do dopasowania trenera z panelu do statycznej listy sztabu.
 * Ignoruje wielkość liter, nadmiarowe spacje i kolejność imię/nazwisko.
 */
export function personNameKey(name: string) {
  return name
    .normalize("NFC")
    .toLocaleLowerCase("pl")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

/** Statyczny wpis sztabu; aliasy obejmują inną pisownię tej samej osoby w panelu. */
export type KnownPerson = { name: string; aliases?: string[] };

function knownKeys(person: KnownPerson) {
  return [person.name, ...(person.aliases ?? [])].map(personNameKey);
}

/** Trener z publicznego zapytania panelu (`people.listTrainersPublic`). */
export type PanelTrainer = {
  name: string;
  position: string | null;
  phone: string | null;
  email: string | null;
  teamSlug: string | null;
  teamName: string | null;
  photoUrl: string | null;
};

/**
 * Panel trzyma nazwiska wielkimi literami („ARTUR  SYBIS-KAŁUSKI”), strona
 * pokazuje je jak w statycznej liście („Artur Sybis-Kałuski”).
 */
export function displayPersonName(name: string) {
  const collapsed = name.trim().replace(/\s+/g, " ");
  if (collapsed !== collapsed.toLocaleUpperCase("pl")) return collapsed;
  return collapsed
    .toLocaleLowerCase("pl")
    .replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, letter: string) =>
      sep + letter.toLocaleUpperCase("pl"),
    );
}

export function trainerPhotoMap(
  trainers: { name: string; photoUrl: string | null }[] | undefined,
) {
  return new Map(
    (trainers ?? []).flatMap((trainer) =>
      trainer.photoUrl ? [[personNameKey(trainer.name), trainer.photoUrl]] : [],
    ),
  );
}

/** Zdjęcie z panelu ma pierwszeństwo przed plikiem z repozytorium. */
export function withTrainerPhoto<T extends KnownPerson>(
  person: T,
  photos: Map<string, string>,
  fallback: string | null | undefined,
) {
  for (const key of knownKeys(person)) {
    const photo = photos.get(key);
    if (photo) return photo;
  }
  return fallback ?? null;
}

export type ExtraTrainer = {
  name: string;
  position: string | null;
  phone: string | null;
  email: string | null;
  photoUrl: string | null;
  teams: { slug: string; name: string }[];
};

/**
 * Trenerzy dodani tylko w panelu (spoza statycznej listy). Panel zapisuje
 * jedną drużynę na rekord, więc ta sama osoba może mieć kilka rekordów -
 * łączymy je w jeden wpis z listą drużyn.
 */
export function panelOnlyTrainers(
  trainers: PanelTrainer[] | undefined,
  known: KnownPerson[],
): ExtraTrainer[] {
  const knownSet = new Set(known.flatMap(knownKeys));
  const byKey = new Map<string, ExtraTrainer>();
  for (const trainer of trainers ?? []) {
    const key = personNameKey(trainer.name);
    if (knownSet.has(key)) continue;
    const entry = byKey.get(key) ?? {
      name: displayPersonName(trainer.name),
      position: trainer.position,
      phone: trainer.phone,
      email: trainer.email,
      photoUrl: trainer.photoUrl,
      teams: [],
    };
    entry.position ??= trainer.position;
    entry.phone ??= trainer.phone;
    entry.email ??= trainer.email;
    entry.photoUrl ??= trainer.photoUrl;
    if (
      trainer.teamSlug &&
      trainer.teamName &&
      !entry.teams.some((team) => team.slug === trainer.teamSlug)
    ) {
      entry.teams.push({ slug: trainer.teamSlug, name: trainer.teamName });
    }
    byKey.set(key, entry);
  }
  return [...byKey.values()];
}

/**
 * Sztab drużyny: statyczne przypisania plus trenerzy przypisani w panelu do
 * tej drużyny. Osoba znana ze statycznej listy, a przypisana w panelu do
 * kolejnej drużyny, pojawia się także tam.
 */
export function mergeTeamCoaches<T extends KnownPerson & { photoUrl?: string | null }>(
  teamSlug: string,
  teamCoaches: T[],
  allKnown: (KnownPerson & { photo?: string | null })[],
  trainers: PanelTrainer[] | undefined,
) {
  const photos = trainerPhotoMap(trainers);
  const present = new Set(teamCoaches.flatMap(knownKeys));
  const merged: { name: string; photoUrl: string | null; position?: string }[] =
    teamCoaches.map((coach) => ({
      name: coach.name,
      photoUrl: withTrainerPhoto(coach, photos, coach.photoUrl),
    }));
  for (const trainer of trainers ?? []) {
    if (trainer.teamSlug !== teamSlug) continue;
    const key = personNameKey(trainer.name);
    if (present.has(key)) continue;
    present.add(key);
    const staticMatch = allKnown.find((person) => knownKeys(person).includes(key));
    if (staticMatch) knownKeys(staticMatch).forEach((alias) => present.add(alias));
    merged.push(
      staticMatch
        ? {
            name: staticMatch.name,
            photoUrl: withTrainerPhoto(staticMatch, photos, staticMatch.photo),
          }
        : {
            name: displayPersonName(trainer.name),
            photoUrl: trainer.photoUrl,
            position: trainer.position ?? undefined,
          },
    );
  }
  return merged;
}
