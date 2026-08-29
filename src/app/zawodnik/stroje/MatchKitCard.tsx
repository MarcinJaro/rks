"use client";

import { Mail, ShirtIcon } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { kitInfo } from "@/data/zawodnik";

/**
 * Cena, skład kompletu i adres zamówień są edytowalne w panelu
 * (Ustawienia -> Stroje meczowe). Wartości statyczne z kitInfo służą jako
 * fallback, dopóki klub nic nie wpisze.
 */
export function MatchKitCard() {
  const settings = useQuery(api.settings.getMany, {
    keys: ["kit_price", "kit_includes", "kit_order_email"],
  });

  const price = settings?.kit_price || kitInfo.matchKitPrice;
  const includes = settings?.kit_includes || null;
  const orderEmail = settings?.kit_order_email || kitInfo.orderEmail;

  return (
    <article className="rounded-[24px] border border-white/8 bg-card p-7">
      <ShirtIcon className="text-primary" size={32} />
      <h2 className="mt-5 text-2xl font-black text-white">Strój meczowy</h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        Stroje meczowe zamawiamy wyłącznie mailowo w klubie - nie kupuje się
        ich w fanshopie.
      </p>

      <div className="mt-6 rounded-[16px] bg-primary p-5 text-[#002349]">
        <p className="text-sm font-black uppercase">Koszt kompletu</p>
        <p className="mt-1 text-3xl font-black">{price}</p>
        {includes ? (
          <p className="mt-2 text-sm font-bold">W skład wchodzi: {includes}.</p>
        ) : null}
      </div>

      <p className="mt-6 text-sm font-black uppercase text-primary">
        W mailu podaj
      </p>
      <ul className="mt-3 space-y-2">
        {kitInfo.orderFields.map((field) => (
          <li
            key={field}
            className="rounded-[14px] bg-[var(--surface-raised)] px-4 py-3 text-sm text-muted-foreground"
          >
            {field}
          </li>
        ))}
      </ul>

      <Button asChild className="mt-6">
        <a href={`mailto:${orderEmail}`}>
          <Mail size={18} />
          {orderEmail}
        </a>
      </Button>
    </article>
  );
}
