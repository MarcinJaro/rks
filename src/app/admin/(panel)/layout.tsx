"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { ReactNode } from "react";

const navItems = [
  { href: "/admin", label: "Pulpit" },
  { href: "/admin/live", label: "Transmisja live" },
  { href: "/admin/mecze", label: "Mecze" },
  { href: "/admin/druzyny", label: "Drużyny" },
  { href: "/admin/ludzie", label: "Ludzie" },
  { href: "/admin/sponsorzy", label: "Sponsorzy" },
  { href: "/admin/galerie", label: "Galerie" },
  { href: "/admin/dokumenty", label: "Dokumenty" },
  { href: "/admin/ustawienia", label: "Ustawienia" },
];

export default function AdminPanelLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="container-page grid gap-8 py-10 lg:grid-cols-[220px_1fr]">
      <aside>
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm font-black uppercase text-primary">
            Panel admina
          </p>
          <UserButton />
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm font-bold transition ${
                  isActive
                    ? "bg-muted text-primary"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
