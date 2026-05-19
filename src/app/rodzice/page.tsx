import { PageHeader } from "@/components/shared/PageHeader";
import { legacyDocuments, parentContacts } from "@/data/legacy";

export default function ParentsPage() {
  return (
    <>
      <PageHeader
        title="Dla rodziców"
        description="Najważniejsze informacje organizacyjne dla rodziców zawodników Akademii RKS Okęcie."
      />
      <section className="container-page py-12">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Zajęcia od 3 roku życia", "Klub zaprasza dzieci na zajęcia sportowe prowadzone przez wykwalifikowaną kadrę trenerską."],
            ["Regularne treningi", "Treningi odbywają się na boiskach naturalnych, orlikach oraz halach sportowych w okresie jesienno-zimowym."],
            ["Rozgrywki i turnieje", "Zawodnicy biorą udział w rozgrywkach MZPN oraz turniejach dostosowanych do wieku."],
            ["Składka członkowska", "Informacje o aktualnej wysokości składki i ewentualnych zniżkach przekazuje trener lub sekretariat klubu."],
          ].map(([title, body]) => (
            <article key={title} className="rounded-[20px] border border-white/8 bg-card p-6">
              <h2 className="text-xl font-black text-white">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{body}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-[24px] border border-white/8 bg-card p-6">
            <h2 className="text-2xl font-black text-white">Kontakt do trenerów</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {parentContacts.map(([year, coach, phone]) => (
                <div key={year} className="rounded-[16px] bg-[var(--surface-raised)] p-4">
                  <p className="text-sm font-black text-primary">Rocznik {year}</p>
                  <p className="mt-2 text-sm text-white">{coach}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{phone}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/8 bg-card p-6">
            <h2 className="text-2xl font-black text-white">Dokumenty</h2>
            <div className="mt-6 space-y-3">
              {legacyDocuments.map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  className="block rounded-[14px] border border-white/8 p-4 text-sm font-bold text-muted-foreground hover:border-primary hover:text-primary"
                >
                  {label}
                </a>
              ))}
            </div>
            <p className="mt-6 text-sm leading-7 text-muted-foreground">
              Przed pierwszymi zajęciami klub prosi o bezpośredni kontakt z trenerem
              danego rocznika i przygotowanie wymaganych dokumentów.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
