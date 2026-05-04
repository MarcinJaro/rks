import Image from "next/image";
import { MapPin, Ruler, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { clubInfo } from "@/data/site";

const stadiumFacts = [
  { Icon: MapPin, label: "Adres", value: "ul. Radarowa 1, 02-137 Warszawa" },
  { Icon: Users, label: "Pojemność", value: "900 miejsc" },
  { Icon: Ruler, label: "Boisko", value: "105 m x 55 m" },
];

export default function StadiumPage() {
  return (
    <>
      <PageHeader
        title="Stadion RKS Okęcie"
        description={clubInfo.address}
      />
      <section className="container-page py-12">
        <div className="relative aspect-[1200/530] overflow-hidden rounded-[28px] border border-white/8 bg-card shadow-sm">
          <Image
            src="/images/legacy/stadium-1.jpg"
            alt="Stadion RKS Okęcie Warszawa"
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {stadiumFacts.map(({ Icon, label, value }) => (
            <article key={label} className="rounded-[20px] border border-white/8 bg-card p-6">
              <Icon className="text-primary" size={26} />
              <p className="mt-5 text-sm font-black uppercase text-muted-foreground">
                {label}
              </p>
              <h2 className="mt-2 text-xl font-black text-white">{value}</h2>
            </article>
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {["stadium-stand.jpg", "stadium-2.jpg"].map((image) => (
            <Image
              key={image}
              src={`/images/legacy/${image}`}
              alt="Stadion RKS Okęcie"
              width={1200}
              height={530}
              className="aspect-[16/9] rounded-[20px] border border-white/8 object-cover"
            />
          ))}
        </div>
      </section>
    </>
  );
}
