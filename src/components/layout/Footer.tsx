import Image from "next/image";
import Link from "next/link";
import { ExternalLink, MapPin, Phone } from "lucide-react";
import { clubInfo, navItems } from "@/data/site";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-white/8 bg-[var(--footer)] text-white">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <Image
            src="/images/figma/crest-rks.png"
            alt="RKS Okęcie Warszawa"
            width={64}
            height={64}
            className="mb-5"
          />
          <p className="max-w-sm text-sm leading-7 text-white/75">
            Oficjalna strona RKS Okęcie Warszawa. Piłka nożna, szkolenie
            młodzieży, seniorzy i życie klubu przy Radarowej.
          </p>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-black uppercase text-primary">
            Na skróty
          </h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="font-bold text-white/85 transition hover:text-primary hover:underline"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-black uppercase text-primary">
            Kontakt
          </h2>
          <div className="space-y-3 text-sm font-bold text-white/85">
            <p className="flex gap-2">
              <MapPin className="shrink-0 text-primary" size={18} /> {clubInfo.address}
            </p>
            <p className="flex gap-2">
              <Phone className="shrink-0 text-primary" size={18} /> {clubInfo.phone}
            </p>
            <Link
              href="https://www.facebook.com/rks.okeciewarszawa"
              className="flex gap-2 transition hover:text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="shrink-0 text-primary" size={18} /> Facebook RKS Okęcie
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
