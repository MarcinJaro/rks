import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  Camera,
  ExternalLink,
  MapPin,
  MessageCircle,
  Phone,
  ShoppingBag,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { clubShop, socialLinks } from "@/data/site";
import { fanFriends, fanZoneSections } from "@/data/legacy";

const calendarLinks = [
  {
    label: "Kalendarz Google",
    href: "https://calendar.google.com/calendar?cid=cmtzb2tlY2llLnBsX3Bwdjk5aW9lNjFia3VvbXYzanM5djY3ZDljQGdyb3VwLmNhbGVuZGFyLmdvb2dsZS5jb20",
  },
  {
    label: "Apple / Outlook",
    href: "webcal://calendar.google.com/calendar/ical/rksokecie.pl_ppv99ioe61bkuomv3js9v67d9c%40group.calendar.google.com/public/basic.ics",
  },
];

const fanLinks = [
  {
    label: "Oficjalny fanpage klubu",
    href: socialLinks.facebook,
    icon: MessageCircle,
  },
  {
    label: "Instagram RKS Okęcie",
    href: socialLinks.instagram,
    icon: Camera,
  },
  {
    label: "Kibice RKS Okęcie",
    href: "https://www.facebook.com/UltrasOkecie/",
    icon: MessageCircle,
  },
  {
    label: clubShop.label,
    href: clubShop.href,
    icon: ShoppingBag,
  },
];

export default function FansPage() {
  return (
    <>
      <PageHeader
        title="Strefa kibica"
        description="Kalendarz, pamiątki klubowe, historia kibiców, legendy RKS Okęcie, śpiewnik i najważniejsze linki społecznościowe."
      />
      <section className="container-page py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {fanZoneSections.map((section) => (
            <Link
              key={section.title}
              href={section.href}
              className="rounded-[20px] border border-white/8 bg-card p-5 transition hover:border-primary"
            >
              <p className="text-sm font-black uppercase text-primary">
                Strefa kibica
              </p>
              <h2 className="mt-3 text-xl font-black text-white">
                {section.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {section.body}
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1fr]">
          <article id="kalendarz" className="rounded-[24px] border border-white/8 bg-card p-6">
            <CalendarDays className="text-primary" size={28} />
            <h2 className="mt-4 text-2xl font-black text-white">
              Kalendarz sportowy
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Dodaj terminarz wydarzeń RKS Okęcie Warszawa do kalendarza w
              telefonie lub komputerze. Zmiany będą aktualizowały się
              automatycznie.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {calendarLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="inline-flex items-center gap-2 rounded-md border border-white/10 px-4 py-3 text-sm font-black text-white transition hover:border-primary hover:text-primary"
                >
                  {link.label} <ExternalLink size={15} />
                </a>
              ))}
            </div>
          </article>

          <article id="pamiatki" className="rounded-[24px] border border-white/8 bg-card p-6">
            <ShoppingBag className="text-primary" size={28} />
            <h2 className="mt-4 text-2xl font-black text-white">
              Pamiątki klubowe i sklep
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Pamiątki klubowe i odzież RKS można kierować przez oficjalny sklep
              lub kibicowski profil społecznościowy. Link do fanshopu NO10
              zostanie podmieniony po otrzymaniu finalnego adresu.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {fanLinks.map((link) => {
                const Icon = link.icon;

                return (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-[14px] bg-[var(--surface-raised)] p-4 text-sm font-bold text-muted-foreground transition hover:text-primary"
                  >
                    <Icon className="shrink-0 text-primary" size={20} />
                    {link.label}
                  </a>
                );
              })}
            </div>
          </article>
        </div>

        <section
          id="przyjaciele"
          className="mt-8 scroll-mt-24 rounded-[24px] border border-white/8 bg-card p-6 sm:p-8"
        >
          <h2 className="text-2xl font-black text-white">
            Przyjaciele Okęcia
          </h2>

          {fanFriends.map((friend) => (
            <article
              key={friend.name}
              className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)] lg:gap-8"
            >
              <div>
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <div className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-white p-2 sm:size-32">
                    <Image
                      src={friend.crest}
                      alt={`Herb ${friend.name}`}
                      width={270}
                      height={270}
                      className="size-full object-contain"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase text-primary">
                      PWKS Huragan
                    </p>
                    <h3 className="mt-2 max-w-xl text-xl font-black leading-tight text-white sm:text-2xl">
                      {friend.fullName}
                    </h3>
                  </div>
                </div>

                <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-bold text-muted-foreground">
                      Rok założenia
                    </dt>
                    <dd className="mt-1 font-black text-white">
                      {friend.founded}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold text-muted-foreground">Barwy</dt>
                    <dd className="mt-1 font-black text-white">
                      {friend.colors}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="sr-only">Adres</dt>
                    <dd className="flex items-start gap-2 font-bold text-white">
                      <MapPin
                        aria-hidden="true"
                        className="mt-0.5 shrink-0 text-primary"
                        size={18}
                      />
                      {friend.address}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="sr-only">Telefon</dt>
                    <dd>
                      <a
                        href={`tel:${friend.phone.replace(/[^+\d]/g, "")}`}
                        className="inline-flex items-center gap-2 font-bold text-white transition hover:text-primary"
                      >
                        <Phone
                          aria-hidden="true"
                          className="shrink-0 text-primary"
                          size={18}
                        />
                        {friend.phone}
                      </a>
                    </dd>
                  </div>
                </dl>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <a
                    href={friend.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-primary bg-primary px-4 py-3 text-sm font-black text-primary-foreground transition hover:bg-transparent hover:text-primary"
                  >
                    Oficjalna strona
                    <ExternalLink aria-hidden="true" size={15} />
                  </a>
                  <a
                    href={friend.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 px-4 py-3 text-sm font-black text-white transition hover:border-primary hover:text-primary"
                  >
                    Facebook (nieoficjalny)
                    <ExternalLink aria-hidden="true" size={15} />
                  </a>
                </div>
              </div>

              <aside className="rounded-[18px] bg-[var(--surface-raised)] p-5 sm:p-6">
                <p className="text-sm font-black uppercase text-primary">
                  Stadion
                </p>
                <h4 className="mt-2 text-xl font-black text-white">
                  {friend.stadium.name}
                </h4>
                <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3 lg:grid-cols-1">
                  <div>
                    <dt className="font-bold text-muted-foreground">
                      Pojemność
                    </dt>
                    <dd className="mt-1 font-bold text-white">
                      {friend.stadium.capacity}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold text-muted-foreground">
                      Oświetlenie
                    </dt>
                    <dd className="mt-1 font-bold text-white">
                      {friend.stadium.floodlights}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold text-muted-foreground">Boisko</dt>
                    <dd className="mt-1 font-bold text-white">
                      {friend.stadium.pitch}
                    </dd>
                  </div>
                </dl>
              </aside>
            </article>
          ))}
        </section>
      </section>
    </>
  );
}
