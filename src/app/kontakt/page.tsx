import {
  CalendarDays,
  Landmark,
  Mail,
  MapPin,
  Palette,
  Phone,
  UsersRound,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { clubInfo } from "@/data/site";

const contactPeople = [
  {
    label: "Koordynator Akademii",
    name: "Joanna Pleban-Kilman",
    phone: "798 876 570",
    email: "j.kilman@rksokecie.pl",
  },
  {
    label: "Kierownik klubu",
    name: "Sekretariat RKS Okęcie",
    phone: "798 876 570",
    email: "rksokecie@rksokecie.pl",
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHeader
        title="Kontakt"
        description="Adres stadionu przy Radarowej, dane rejestrowe klubu oraz szybki kontakt w sprawach zapisów, treningów i współpracy."
      />
      <section className="container-page grid gap-8 py-12 lg:grid-cols-[.9fr_1.1fr]">
        <div className="space-y-6">
          <div className="rounded-[24px] border border-white/8 bg-card p-6 shadow-sm">
            <h2 className="text-2xl font-black text-white">{clubInfo.name}</h2>
            <div className="mt-6 space-y-4 text-sm text-muted-foreground">
              <p className="flex gap-3">
                <MapPin className="shrink-0 text-secondary" size={20} />
                {clubInfo.address}
              </p>
              <p className="flex gap-3">
                <Phone className="shrink-0 text-secondary" size={20} />
                <a href={`tel:${clubInfo.phone.replaceAll(" ", "")}`}>
                  {clubInfo.phone}
                </a>
              </p>
              <p className="flex gap-3">
                <Mail className="shrink-0 text-secondary" size={20} />
                <a href={`mailto:${clubInfo.email}`}>{clubInfo.email}</a>
              </p>
            </div>
            <Button asChild className="mt-6">
              <a href={`mailto:${clubInfo.email}`}>Napisz do klubu</a>
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[18px] border border-white/8 bg-muted p-5">
              <CalendarDays className="text-primary" size={22} />
              <p className="mt-3 text-xs font-black uppercase text-muted-foreground">
                Rok założenia
              </p>
              <p className="mt-1 text-xl font-black text-white">
                {clubInfo.founded}
              </p>
            </div>
            <div className="rounded-[18px] border border-white/8 bg-muted p-5">
              <Palette className="text-primary" size={22} />
              <p className="mt-3 text-xs font-black uppercase text-muted-foreground">
                Barwy
              </p>
              <p className="mt-1 text-xl font-black text-white">
                {clubInfo.colors}
              </p>
            </div>
            <div className="rounded-[18px] border border-white/8 bg-muted p-5">
              <Landmark className="text-primary" size={22} />
              <p className="mt-3 text-xs font-black uppercase text-muted-foreground">
                NIP
              </p>
              <p className="mt-1 text-xl font-black text-white">
                {clubInfo.nip}
              </p>
            </div>
            <div className="rounded-[18px] border border-white/8 bg-muted p-5">
              <Landmark className="text-primary" size={22} />
              <p className="mt-3 text-xs font-black uppercase text-muted-foreground">
                KRS
              </p>
              <p className="mt-1 text-xl font-black text-white">
                {clubInfo.krs}
              </p>
            </div>
          </div>
        </div>

        <form className="rounded-[24px] border border-white/8 bg-card p-6 shadow-sm">
          <div className="mb-6 rounded-[18px] border border-white/8 bg-muted p-5">
            <UsersRound className="text-primary" size={24} />
            <h2 className="mt-3 text-xl font-black text-white">
              Kogo szukasz?
            </h2>
            <div className="mt-4 grid gap-3">
              {contactPeople.map((person) => (
                <div key={person.email} className="text-sm text-muted-foreground">
                  <p className="font-black text-white">{person.label}</p>
                  <p>{person.name}</p>
                  <p>
                    {person.phone} ·{" "}
                    <a className="text-secondary" href={`mailto:${person.email}`}>
                      {person.email}
                    </a>
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">
              Imię i nazwisko
              <input className="h-11 rounded-md border border-border bg-background px-3" />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Email
              <input className="h-11 rounded-md border border-border bg-background px-3" type="email" />
            </label>
          </div>
          <label className="mt-4 grid gap-2 text-sm font-bold">
            Wiadomość
            <textarea className="min-h-36 rounded-md border border-border bg-background p-3" />
          </label>
          <Button className="mt-5" type="submit">
            Wyślij wiadomość
          </Button>
        </form>
      </section>
    </>
  );
}
