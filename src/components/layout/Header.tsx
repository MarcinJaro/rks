import Image from "next/image";
import Link from "next/link";
import { Menu, Search } from "lucide-react";
import { navItems } from "@/data/site";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/15 bg-[#020617]/80 backdrop-blur-xl">
      <div className="container-page flex h-20 items-center justify-between gap-5">
        <Link href="/" className="flex items-center gap-3">
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
          {navItems.filter((item) => item.href !== "/kontakt").map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-base font-bold transition hover:bg-white/5 hover:text-primary ${
                index === 0
                  ? "border-b-2 border-primary text-primary"
                  : "text-[#cbd5e1]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" className="hidden text-[#cbd5e1] sm:inline-flex" aria-label="Szukaj">
            <Search size={22} />
          </Button>
          <Button asChild size="sm" variant="secondary" className="hidden rounded-full px-7 text-[#002e5e] sm:inline-flex">
            <Link href="/kontakt">Kontakt</Link>
          </Button>
          <Button
            size="icon"
            variant="outline"
            aria-label="Otwórz menu"
            className="border-white/10 bg-white/5 text-white md:hidden"
          >
            <Menu size={20} />
          </Button>
        </div>
      </div>
    </header>
  );
}
