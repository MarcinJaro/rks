import Link from "next/link";

const modules = [
  ["Transmisja live", "/admin/live", "Włącz i wyłącz sekcję „Mecz live” na stronie głównej"],
  ["Mecze", "/admin/mecze", "Terminarz, wyniki i linki do nagrań VEO/YouTube"],
  ["Drużyny", "/admin/druzyny", "Zespoły, trenerzy, zdjęcia grupowe"],
  ["Ludzie", "/admin/ludzie", "Trenerzy, zarząd, legendy klubu"],
  ["Sponsorzy", "/admin/sponsorzy", "Loga, linki i kolejność partnerów"],
  ["Galerie", "/admin/galerie", "Albumy zdjęć z meczów i wydarzeń"],
  ["Dokumenty", "/admin/dokumenty", "Pliki PDF na stronie dokumentów klubu"],
  ["Ustawienia", "/admin/ustawienia", "Dane kontaktowe i linki społecznościowe"],
] as const;

export default function AdminDashboardPage() {
  return (
    <>
      <h1 className="text-3xl font-black text-navy">Pulpit</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Wybierz moduł, którym chcesz zarządzać.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules.map(([label, href, description]) => (
          <Link
            key={href}
            href={href}
            className="rounded-lg border border-border bg-card p-5 shadow-sm transition hover:border-primary"
          >
            <p className="text-lg font-black text-navy">{label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
