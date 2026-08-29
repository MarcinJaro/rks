import type { Metadata } from "next";
import { Building2, Landmark, Mail, Phone, UserRoundCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Stagger, StaggerItem } from "@/components/shared/Motion";
import { Button } from "@/components/ui/button";
import {
  individualTrainingBilling,
  individualTrainingProviders,
} from "@/data/zawodnik";
import { parentFees } from "@/data/legacy";
import { clubInfo } from "@/data/site";
import { telHref } from "@/lib/phone";

export const metadata: Metadata = {
  title: "Treningi indywidualne",
  description:
    "Treningi indywidualne w RKS Okęcie: Skill Up, Football Tigers Center i Fundamental Motor Skills. Kontakty do trenerów i zasady rozliczeń.",
};

const signupSubject = encodeURIComponent("Zapisy na treningi indywidualne");

export default function IndividualTrainingPage() {
  return (
    <>
      <PageHeader
        title="Treningi indywidualne"
        description="Dodatkowe zajęcia techniczne i motoryczne prowadzone przez trenerów współpracujących z klubem. Wybierz trenera i umów się bezpośrednio."
      />

      <section className="container-page py-12">
        <Stagger className="grid gap-5 lg:grid-cols-3">
          {individualTrainingProviders.map((provider) => (
            <StaggerItem key={provider.brand}>
              <article className="flex h-full flex-col rounded-[24px] border border-white/8 bg-card p-6">
                <Building2 className="text-primary" size={28} />
                <h2 className="mt-5 text-2xl font-black text-white">
                  {provider.brand}
                </h2>
                <p className="mt-2 text-sm font-bold uppercase text-primary">
                  {provider.focus}
                </p>
                <div className="mt-6 grid gap-3">
                  {provider.coaches.map((coach) => (
                    <div
                      key={coach.name}
                      className="rounded-[14px] bg-[var(--surface-raised)] p-4"
                    >
                      <p className="text-sm font-black text-white">
                        {coach.name}
                      </p>
                      <a
                        href={telHref(coach.phone)}
                        className="mt-2 flex items-center gap-2 text-sm text-muted-foreground transition hover:text-primary"
                      >
                        <Phone size={16} />
                        {coach.phone}
                      </a>
                    </div>
                  ))}
                </div>
              </article>
            </StaggerItem>
          ))}
        </Stagger>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <article className="rounded-[24px] border border-white/8 bg-card p-7">
            <Landmark className="text-primary" size={30} />
            <h2 className="mt-5 text-2xl font-black text-white">
              Rozliczenie zajęć
            </h2>
            <div className="mt-6 grid gap-4">
              {individualTrainingBilling.map((entry) => (
                <div
                  key={entry.who}
                  className="rounded-[16px] bg-[var(--surface-raised)] p-5"
                >
                  <p className="flex items-center gap-2 text-sm font-black uppercase text-primary">
                    <UserRoundCheck size={16} />
                    {entry.who}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {entry.rule}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-[16px] border border-white/8 p-5">
              <p className="text-xs font-black uppercase text-muted-foreground">
                Konto klubowe {parentFees.bank}
              </p>
              <p className="mt-2 text-lg font-black text-white">
                {parentFees.account}
              </p>
            </div>
          </article>

          <article className="rounded-[24px] border border-white/8 bg-card p-7">
            <Mail className="text-primary" size={30} />
            <h2 className="mt-5 text-2xl font-black text-white">
              Nie wiesz, którego trenera wybrać?
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Napisz do klubu - podpowiemy, który profil zajęć będzie
              najlepszy dla Twojego dziecka, i skontaktujemy Cię z trenerem.
            </p>
            <Button asChild className="mt-6">
              <a href={`mailto:${clubInfo.email}?subject=${signupSubject}`}>
                <Mail size={18} />
                Napisz do klubu
              </a>
            </Button>
          </article>
        </div>
      </section>
    </>
  );
}
