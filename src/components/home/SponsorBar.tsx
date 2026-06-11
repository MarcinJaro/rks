import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/shared/Motion";
import { partnerLogos } from "@/data/site";

export function SponsorBar() {
  return (
    <section className="border-y border-white/5 bg-[var(--sponsor-bg)] py-14">
      <div className="container-page">
        <FadeIn>
          <div className="flex flex-col gap-8">
            <p className="text-sm font-black uppercase tracking-[0.45em] text-white/65">
              Sponsorzy i partnerzy
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {partnerLogos.map((partner) => (
                <PartnerLogo key={partner.name} partner={partner} />
              ))}
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

function PartnerLogo({
  partner,
}: {
  partner: (typeof partnerLogos)[number];
}) {
  const content = (
    <div className="group grid h-28 place-items-center rounded-md border border-white/8 bg-white p-4 text-center transition hover:border-primary">
      {partner.logo ? (
        <Image
          src={partner.logo}
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
          <p className="mt-1 text-[11px] font-bold uppercase text-[#4b647f]">
            {partner.kind}
          </p>
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
