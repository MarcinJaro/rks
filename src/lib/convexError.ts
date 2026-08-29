import { ConvexError } from "convex/values";

/**
 * Czytelny komunikat błędu mutacji Convex. ConvexError niesie treść aplikacyjną
 * także na produkcji (zwykły Error jest tam redagowany do "Server Error").
 */
export function errorMessage(err: unknown, fallback = "Coś poszło nie tak") {
  if (err instanceof ConvexError) {
    return typeof err.data === "string" ? err.data : fallback;
  }
  if (err instanceof Error) {
    return err.message.replace(/^\[.*?\]\s*/, "");
  }
  return fallback;
}
