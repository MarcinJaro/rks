import Image from "next/image";
import Link from "next/link";
import { ArrowRight, PlusCircle } from "lucide-react";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Stagger, StaggerItem } from "@/components/shared/Motion";

const featuredTeams = [
  {
    title: "Seniorzy",
    subtitle: "Liga Okręgowa, Grupa 1",
    href: "/druzyny/seniorzy",
    image: "/images/figma/team-seniors.png",
  },
  {
    title: "Rocznik 2010",
    subtitle: "Ekstraliga Mazowiecka",
    href: "/druzyny/rocznik-2010",
    image: "/images/figma/team-2010.png",
  },
  {
    title: "Rocznik 2014",
    subtitle: "Pierwsze kroki w futbolu",
    href: "/druzyny/rocznik-2014",
    image: "/images/figma/team-2014.png",
  },
];

export function TeamsGrid() {
  return (
    <section className="bg-[#0d1321] py-20">
      <div className="container-page">
        <div className="mb-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <SectionHeading title="Nasze Drużyny" />
          <Link
            href="/druzyny"
            className="inline-flex items-center gap-2 text-base font-black text-accent hover:underline"
          >
            Wszystkie roczniki <ArrowRight size={18} />
          </Link>
        </div>

        <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featuredTeams.map((team) => (
            <StaggerItem key={team.href}>
              <Link
                href={team.href}
                className="group relative block aspect-[286/400] overflow-hidden rounded-[24px] bg-[#111827]"
              >
                <Image
                  src={team.image}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 25vw, 100vw"
                  className="object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_42%,rgba(0,0,0,.84))]" />
                <div className="absolute inset-x-0 bottom-0 p-8">
                  <h3 className="text-2xl font-black uppercase text-white">
                    {team.title}
                  </h3>
                  <p className="mt-2 translate-y-2 text-sm text-[#cbd5e1] opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                    {team.subtitle}
                  </p>
                </div>
              </Link>
            </StaggerItem>
          ))}

          <StaggerItem>
            <Link
              href="/kontakt"
              className="group grid aspect-[286/400] place-items-center rounded-[24px] border border-dashed border-[#434857] bg-[#131929] p-8 text-center transition hover:border-primary"
            >
              <div>
                <PlusCircle className="mx-auto text-accent transition group-hover:text-primary" size={44} />
                <h3 className="mt-8 text-2xl font-black uppercase text-white">
                  Rekrutacja
                </h3>
                <p className="mt-4 text-sm leading-6 text-[#a6aabc]">
                  Dołącz do Akademii RKS Okęcie i zacznij swoją przygodę.
                </p>
              </div>
            </Link>
          </StaggerItem>
        </Stagger>
      </div>
    </section>
  );
}
