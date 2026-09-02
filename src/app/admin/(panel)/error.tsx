"use client";

import { CircleAlert, RefreshCw } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section
      aria-labelledby="admin-error-title"
      role="alert"
      className="mx-auto mt-12 max-w-xl rounded-xl border border-[#efc7c7] bg-white p-6 text-center shadow-sm sm:p-8"
    >
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#fff0f0] text-[#a61b1b]">
        <CircleAlert aria-hidden="true" size={24} />
      </span>
      <h1 id="admin-error-title" className="mt-4 text-xl font-black text-navy">
        Nie udało się wczytać danych
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        Połączenie z panelem zostało przerwane albo zapytanie zakończyło się błędem.
        Spróbuj ponownie. Jeśli problem wraca, sprawdź stan Convex.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>
          <RefreshCw aria-hidden="true" size={16} />
          Spróbuj ponownie
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin">Wróć do pulpitu</Link>
        </Button>
      </div>
    </section>
  );
}
