import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";

/**
 * Strażnik panelu administracyjnego. Samo zalogowanie w Clerku NIE wystarczy -
 * instancja Clerka ma otwartą rejestrację (self-service sign-up + Google),
 * więc każdy anonim mógłby założyć konto i wołać funkcje panelu bezpośrednio
 * przez klienta Convex (URL deploymentu jest jawny w bundlu). Adres e-mail
 * musi być na liście ADMIN_EMAILS (zmienna środowiskowa Convex, adresy po
 * przecinku).
 *
 * Fail-closed: brak listy lub brak claima e-mail w tokenie = odmowa. Po
 * wdrożeniu na nowy deployment TRZEBA ustawić `npx convex env set ADMIN_EMAILS`
 * oraz dodać claim `email` w szablonie JWT Clerka, inaczej panel jest zamknięty.
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx | ActionCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Brak autoryzacji");
  }

  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (allowlist.length === 0) {
    throw new Error(
      "Panel wymaga ustawienia zmiennej ADMIN_EMAILS w środowisku Convex",
    );
  }

  const email = identity.email?.toLowerCase();
  if (!email) {
    throw new Error(
      "Token logowania nie zawiera adresu e-mail - dodaj claim email w szablonie JWT Clerka",
    );
  }

  if (!allowlist.includes(email)) {
    throw new Error("Brak uprawnień do panelu");
  }

  return identity;
}

/**
 * Dawny mocniejszy wariant. requireAdmin egzekwuje już listę ADMIN_EMAILS,
 * więc to teraz alias - zostaje dla czytelności miejsc operujących na danych
 * osobowych (regulations) i zgodności wywołań.
 */
export const requireAdminWithEmail = requireAdmin;
