"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const playerNavItems = [
  { label: "Jak dołączyć", href: "/zawodnik" },
  { label: "Stroje i sklep", href: "/zawodnik/stroje" },
  { label: "Treningi bramkarskie", href: "/zawodnik/treningi-bramkarskie" },
  { label: "Treningi indywidualne", href: "/zawodnik/treningi-indywidualne" },
  { label: "Opłaty i kontakt", href: "/zawodnik/oplaty" },
  { label: "Regulamin", href: "/zawodnik/regulamin" },
];

export function PlayerSubnav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sekcja Zawodnik"
      className="border-b border-white/8 bg-[var(--surface-raised)]/60"
    >
      <div className="container-page flex gap-1 overflow-x-auto py-2">
        {playerNavItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition hover:bg-white/5 hover:text-primary",
                isActive
                  ? "bg-primary text-primary-foreground hover:text-primary-foreground"
                  : "text-muted-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
