import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, CircleAlert, Download, PlayCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Stagger, StaggerItem } from "@/components/shared/Motion";
import { Button } from "@/components/ui/button";
import { getVideoEmbed } from "@/lib/videoEmbed";
import { recruitmentSteps, recruitmentVideos } from "@/data/zawodnik";

// Notka o progu wieku jest liczona z bieżącego sezonu - odświeżamy raz na
// dobę, żeby strona nie zamroziła progu z dnia builda po przełomie sezonu.
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Jak dołączyć do Akademii RKS Okęcie",
  description:
    "Komplet formalności krok po kroku: zgoda Zawodnik Naborowy, rejestracja w Łączy Nas Piłka, deklaracja gry amatora, badania lekarskie, regulamin i aplikacja mZawodnik.",
};

export default function PlayerPage() {
  return (
    <>
      <PageHeader
        title="Jak dołączyć"
        description="Zanim dziecko zagra w rozgrywkach, trzeba domknąć kilka formalności. Poniżej cała lista w kolejności, w jakiej warto ją odhaczać."
      />

      <section className="container-page py-12">
        <Stagger className="grid gap-4">
          {recruitmentSteps.map((step, index) => (
            <StaggerItem key={step.title}>
              <article className="grid gap-5 rounded-[20px] border border-white/8 bg-card p-6 sm:grid-cols-[auto_1fr]">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-xl font-black text-primary-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h2 className="text-xl font-black text-white">
                    {step.title}
                  </h2>
                  {step.body ? (
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      {step.body}
                    </p>
                  ) : null}
                  {step.note ? (
                    <p className="mt-3 inline-block rounded-full bg-[var(--chrome)] px-3 py-1 text-xs font-bold text-accent">
                      {step.note}
                    </p>
                  ) : null}
                  {step.emphasis ? (
                    <p className="mt-3 flex gap-2 rounded-[14px] border border-primary/40 bg-primary/10 p-4 text-sm font-bold leading-6 text-primary">
                      <CircleAlert className="mt-0.5 shrink-0" size={18} />
                      {step.emphasis}
                    </p>
                  ) : null}
                  {step.links?.length ? (
                    <div className="mt-4 flex flex-wrap gap-3">
                      {step.links.map((link) => (
                        <Button
                          key={link.href}
                          asChild
                          size="sm"
                          variant="outline"
                        >
                          {link.external ? (
                            <a
                              href={link.href}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {link.label}
                              <ArrowUpRight size={16} />
                            </a>
                          ) : link.href.endsWith(".pdf") ? (
                            <a href={link.href} target="_blank" rel="noreferrer">
                              <Download size={16} />
                              {link.label}
                            </a>
                          ) : (
                            <Link href={link.href}>{link.label}</Link>
                          )}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            </StaggerItem>
          ))}
        </Stagger>

        {recruitmentVideos.length > 0 ? (
          <div className="mt-12">
            <div className="flex items-center gap-3">
              <PlayCircle className="text-primary" size={26} />
              <h2 className="text-2xl font-black text-white">
                Instrukcje wideo
              </h2>
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {recruitmentVideos.map((video) => {
                const embed = getVideoEmbed(video.url);

                return (
                  <figure
                    key={video.url}
                    className="overflow-hidden rounded-[20px] border border-white/8 bg-card"
                  >
                    {embed ? (
                      <div className="aspect-video">
                        <iframe
                          src={embed.src}
                          title={video.title}
                          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          loading="lazy"
                          className="h-full w-full border-0"
                        />
                      </div>
                    ) : null}
                    <figcaption className="p-5 text-sm font-bold leading-6 text-white">
                      {video.title}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <NextStep
            href="/zawodnik/oplaty"
            title="Opłaty i kontakt"
            body="Składka członkowska, numer konta i telefony do trenerów roczników."
          />
          <NextStep
            href="/zawodnik/stroje"
            title="Stroje i sklep"
            body="Zamówienie kompletu meczowego oraz fanshop klubowy NO10."
          />
          <NextStep
            href="/klub/dokumenty"
            title="Dokumenty klubowe"
            body="Statut, regulamin, deklaracje i polityka ochrony dzieci."
          />
        </div>
      </section>
    </>
  );
}

function NextStep({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[18px] border border-white/8 bg-muted p-5 transition hover:border-primary"
    >
      <h3 className="flex items-center gap-2 text-lg font-black text-white">
        {title}
        <ArrowUpRight
          className="text-primary transition group-hover:translate-x-0.5"
          size={18}
        />
      </h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
    </Link>
  );
}
