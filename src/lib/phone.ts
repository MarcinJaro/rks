/** Numery w treści zapisujemy z odstępami - `tel:` wymaga samych cyfr. */
export function telHref(phone: string) {
  const first = phone.split("/")[0] ?? phone;

  return `tel:${first.replace(/\D/g, "")}`;
}
