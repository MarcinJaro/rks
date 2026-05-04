"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, Search, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { navItems } from "@/data/site";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function getNavSection(href: string) {
  return href.split("/").filter(Boolean)[0] ?? "";
}

function isNavItemActive(pathname: string, href: string) {
  const section = getNavSection(href);

  if (!section) {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`/${section}/`) || pathname === `/${section}`;
}

export function Header() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const desktopNavItems = navItems.filter((item) => item.href !== "/kontakt");

  return (
    <header className="sticky top-0 z-40 border-b border-white/15 bg-[#020617]/80 backdrop-blur-xl">
      <div className="container-page flex h-20 items-center justify-between gap-5">
        <Link href="/" className="flex shrink-0 items-center gap-3" onClick={() => setIsMenuOpen(false)}>
          <Image
            src="/images/figma/crest-rks.png"
            alt="RKS Okęcie Warszawa"
            width={48}
            height={48}
            priority
          />
          <span className="sr-only">
            RKS
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {desktopNavItems.map((item) => {
            const isActive = isNavItemActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "rounded-md border-b-2 px-3 py-2 text-base font-bold transition hover:bg-white/5 hover:text-primary",
                  isActive
                    ? "border-primary bg-white/5 text-primary"
                    : "border-transparent text-[#cbd5e1]",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Button size="icon" variant="ghost" className="hidden text-[#cbd5e1] sm:inline-flex" aria-label="Szukaj">
            <Search size={22} />
          </Button>
          <Button
            asChild
            size="sm"
            variant="secondary"
            className={cn(
              "hidden rounded-full px-7 text-[#002e5e] sm:inline-flex",
              isNavItemActive(pathname, "/kontakt") && "ring-2 ring-primary ring-offset-2 ring-offset-[#020617]",
            )}
          >
            <Link href="/kontakt" aria-current={isNavItemActive(pathname, "/kontakt") ? "page" : undefined}>
              Kontakt
            </Link>
          </Button>
          <Button
            size="icon"
            variant="outline"
            aria-controls="mobile-navigation"
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? "Zamknij menu" : "Otwórz menu"}
            onClick={() => setIsMenuOpen((open) => !open)}
            className="border-white/10 bg-white/5 text-white md:hidden"
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>
      </div>

      <div
        id="mobile-navigation"
        className={cn(
          "overflow-hidden border-t border-white/10 bg-[#020617]/95 transition-[max-height,opacity] duration-200 md:hidden",
          isMenuOpen ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <nav className="container-page grid gap-2 py-4">
          {navItems.map((item) => {
            const isActive = isNavItemActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "rounded-md border border-transparent px-4 py-3 text-base font-bold transition hover:border-white/10 hover:bg-white/5 hover:text-primary",
                  isActive
                    ? "border-primary/60 bg-primary text-primary-foreground"
                    : "text-[#e2e8f0]",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
