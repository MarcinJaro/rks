"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { plPL } from "@clerk/localizations";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ReactNode, useMemo } from "react";
import { usePathname } from "next/navigation";

export function AppProviders({ children }: { children: ReactNode }) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const pathname = usePathname();
  const convex = useMemo(
    () => (convexUrl ? new ConvexReactClient(convexUrl) : null),
    [convexUrl],
  );

  // Brak env = strona publiczna działa na danych zapasowych, ale panel bez
  // Clerka/Convexu by się wykładał - pokazujemy jawny komunikat zamiast
  // krachu i cichego pominięcia providerów.
  if (!convex) {
    if (pathname.startsWith("/admin")) {
      return (
        <main className="container-page py-20">
          <h1 className="text-2xl font-black text-white">
            Panel niedostępny - brak konfiguracji
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
            Zmienna środowiskowa NEXT_PUBLIC_CONVEX_URL nie jest ustawiona w tym
            wdrożeniu, więc logowanie i baza danych nie działają. Uzupełnij ją w
            ustawieniach hostingu i zbuduj stronę ponownie.
          </p>
        </main>
      );
    }
    return <>{children}</>;
  }

  return (
    <ClerkProvider localization={plPL}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
