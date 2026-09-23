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

export function trainerPhotoMap(
  trainers: { name: string; photoUrl: string }[] | undefined,
) {
  return new Map(
    (trainers ?? []).map((trainer) => [
      personNameKey(trainer.name),
      trainer.photoUrl,
    ]),
  );
}

/** Zdjęcie z panelu ma pierwszeństwo przed plikiem z repozytorium. */
export function withTrainerPhoto<T extends { name: string }>(
  person: T,
  photos: Map<string, string>,
  fallback: string | null | undefined,
) {
  return photos.get(personNameKey(person.name)) ?? fallback ?? null;
}
