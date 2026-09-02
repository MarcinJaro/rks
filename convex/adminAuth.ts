import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";

export type AdminAccessStatus =
  | "authorized"
  | "unauthenticated"
  | "misconfigured"
  | "missing_email"
  | "forbidden";

type AdminContext = QueryCtx | MutationCtx | ActionCtx;

async function resolveAdminAccess(ctx: AdminContext) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return { status: "unauthenticated" as const };
  }

  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (allowlist.length === 0) {
    return { status: "misconfigured" as const };
  }

  const email = identity.email?.toLowerCase();
  if (!email) {
    return { status: "missing_email" as const };
  }

  if (!allowlist.includes(email)) {
    return { status: "forbidden" as const };
  }

  return { status: "authorized" as const, identity };
}

export async function getAdminAccessStatus(
  ctx: AdminContext,
): Promise<AdminAccessStatus> {
  return (await resolveAdminAccess(ctx)).status;
}

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
export async function requireAdmin(ctx: AdminContext) {
  const access = await resolveAdminAccess(ctx);

  switch (access.status) {
    case "authorized":
      return access.identity;
    case "unauthenticated":
      throw new Error("Brak autoryzacji");
    case "misconfigured":
      throw new Error(
        "Panel wymaga ustawienia zmiennej ADMIN_EMAILS w środowisku Convex",
      );
    case "missing_email":
      throw new Error(
        "Token logowania nie zawiera adresu e-mail - dodaj claim email w szablonie JWT Clerka",
      );
    case "forbidden":
      throw new Error("Brak uprawnień do panelu");
  }
}

/**
 * Dawny mocniejszy wariant. requireAdmin egzekwuje już listę ADMIN_EMAILS,
 * więc to teraz alias - zostaje dla czytelności miejsc operujących na danych
 * osobowych (regulations) i zgodności wywołań.
 */
export const requireAdminWithEmail = requireAdmin;
