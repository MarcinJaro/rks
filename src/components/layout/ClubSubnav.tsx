"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const clubNavItems = [
  { label: "Historia", href: "/klub/historia" },
  { label: "Zarząd", href: "/klub/zarzad" },
  { label: "Sztab szkoleniowy", href: "/klub/sztab" },
  { label: "Stadion", href: "/klub/stadion" },
  { label: "Certyfikacja PZPN", href: "/klub/certyfikacja-pzpn" },
  { label: "Dokumenty", href: "/klub/dokumenty" },
  { label: "NIW-CRSO", href: "/klub/niw-crso" },
];

export function ClubSubnav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sekcja Klub"
      className="border-b border-white/8 bg-[var(--surface-raised)]/60"
    >
      <div className="container-page flex gap-1 overflow-x-auto py-2">
        {clubNavItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition hover:bg-white/5 hover:text-primary",
                isActive ? "bg-primary text-primary-foreground hover:text-primary-foreground" : "text-muted-foreground",
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
