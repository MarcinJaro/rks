"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { FadeIn } from "@/components/shared/Motion";
import { partnerLogos } from "@/data/site";

type SponsorItem = {
  name: string;
  href?: string | null;
  logoUrl?: string | null;
  label?: string | null;
};

// Dane statyczne zostają jako zapas na czas ładowania i na wypadek pustej
// tabeli (np. świeże środowisko przed seedem) - pasek nigdy nie znika.
const fallback: SponsorItem[] = partnerLogos.map((partner) => ({
  name: partner.name,
  href: partner.href,
  logoUrl: partner.logo,
  label: partner.kind,
}));

export function SponsorBar() {
  const sponsors = useQuery(api.sponsors.list);
  const items: SponsorItem[] =
    sponsors && sponsors.length > 0
      ? sponsors.map((sponsor) => ({
          name: sponsor.name,
          href: sponsor.url,
          logoUrl: sponsor.logoUrl,
          label: sponsor.label ?? (sponsor.type === "sponsor" ? "Sponsor" : "Partner"),
        }))
      : fallback;

  return (
    <section className="border-y border-white/5 bg-[var(--sponsor-bg)] py-14">
      <div className="container-page">
        <FadeIn>
          <div className="flex flex-col gap-8">
            <p className="text-sm font-black uppercase tracking-[0.45em] text-white/65">
              Sponsorzy i partnerzy
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {items.map((partner) => (
                <PartnerLogo key={partner.name} partner={partner} />
              ))}
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

function PartnerLogo({ partner }: { partner: SponsorItem }) {
  const content = (
    <div className="group grid h-28 w-40 place-items-center rounded-md border border-white/8 bg-white p-4 text-center transition hover:border-primary sm:w-48">
      {partner.logoUrl ? (
        <Image
          src={partner.logoUrl}
          alt={partner.name}
          width={180}
          height={92}
          className="max-h-16 w-auto object-contain"
        />
      ) : (
        <div>
          <p className="text-lg font-black uppercase text-[#002e5e]">
            {partner.name}
          </p>
          {partner.label ? (
            <p className="mt-1 text-[11px] font-bold uppercase text-[#4b647f]">
              {partner.label}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );

  if (!partner.href) return content;

  const isExternal = partner.href.startsWith("http");

  return (
    <Link
      href={partner.href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      aria-label={partner.name}
    >
      {content}
    </Link>
  );
}
