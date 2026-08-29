import type { Metadata } from "next";
import Link from "next/link";
import { Phone } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { parentContacts, parentFees } from "@/data/legacy";
import { telHref } from "@/lib/phone";

export const metadata: Metadata = {
  title: "Opłaty i kontakt do trenerów",
  description:
    "Składka członkowska Akademii RKS Okęcie, numer konta klubowego oraz telefony do trenerów poszczególnych roczników.",
};

const academyFacts = [
  [
    "Zajęcia od 3 roku życia",
    "Klub zaprasza dzieci na zajęcia sportowe prowadzone przez wykwalifikowaną kadrę trenerską.",
  ],
  [
    "Regularne treningi",
    "Treningi odbywają się na boiskach naturalnych, orlikach oraz halach sportowych w okresie jesienno-zimowym.",
  ],
  [
    "Rozgrywki i turnieje",
    "Zawodnicy biorą udział w rozgrywkach MZPN oraz turniejach dostosowanych do wieku.",
  ],
  [
    "Składka członkowska",
    `Składka wynosi ${parentFees.amount} miesięcznie. Przy rodzeństwie klub przewiduje zniżkę dla każdego następnego dziecka.`,
  ],
];

export default function FeesPage() {
  return (
    <>
      <PageHeader
        title="Opłaty i kontakt"
        description="Składka członkowska, dane do przelewu oraz bezpośrednie telefony do trenerów prowadzących poszczególne roczniki."
      />

      <section className="container-page py-12">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {academyFacts.map(([title, body]) => (
            <article
              key={title}
              className="rounded-[20px] border border-white/8 bg-card p-6"
            >
              <h2 className="text-xl font-black text-white">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {body}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-[24px] border border-white/8 bg-card p-6">
            <h2 className="text-2xl font-black text-white">
              Kontakt do trenerów
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {parentContacts.map(([year, coach, phone]) => (
                <div
                  key={year}
                  className="rounded-[16px] bg-[var(--surface-raised)] p-4"
                >
                  <p className="text-sm font-black text-primary">
                    Rocznik {year}
                  </p>
                  <p className="mt-2 text-sm text-white">{coach}</p>
                  <a
                    href={telHref(phone)}
                    className="mt-1 flex items-center gap-2 text-sm text-muted-foreground transition hover:text-primary"
                  >
                    <Phone size={15} />
                    {phone}
                  </a>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/8 bg-card p-6">
            <h2 className="text-2xl font-black text-white">Opłaty i konto</h2>
            <dl className="mt-6 grid gap-4 text-sm">
              <div className="rounded-[14px] bg-[var(--surface-raised)] p-4">
                <dt className="font-black uppercase text-primary">Składka</dt>
                <dd className="mt-1 text-muted-foreground">
                  {parentFees.amount} miesięcznie, płatne {parentFees.dueDate}.
                </dd>
              </div>
              <div className="rounded-[14px] bg-[var(--surface-raised)] p-4">
                <dt className="font-black uppercase text-primary">
                  Rodzeństwo
                </dt>
                <dd className="mt-1 text-muted-foreground">
                  {parentFees.discount}.
                </dd>
              </div>
              <div className="rounded-[14px] bg-primary p-4 text-[#002349]">
                <dt className="font-black uppercase">
                  Konto {parentFees.bank}
                </dt>
                <dd className="mt-2 text-xl font-black">
                  {parentFees.account}
                </dd>
                <dd className="mt-2 text-sm font-bold">
                  Tytuł przelewu: {parentFees.transferTitle}.
                </dd>
              </div>
            </dl>
            <p className="mt-6 text-sm leading-7 text-muted-foreground">
              Komplet dokumentów do pobrania znajdziesz w sekcji{" "}
              <Link
                href="/klub/dokumenty"
                className="font-bold text-primary hover:underline"
              >
                Dokumenty klubowe
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
