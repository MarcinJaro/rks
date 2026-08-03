import Image from "next/image";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";

const niwProjects = [
  {
    name: "Boisko treningowe dla Lotników",
    funding: "310 000 zł",
    paragraphs: [
      "Wykonanie całościowej renowacji boiska wraz z oświetleniem jako wzmocnienie potencjału instytucjonalnego Stowarzyszenia i realizacji jego celów statutowych.",
      "Działania te pozwolą na zaspokojenie w pełni potrzeb treningowych zawodników trenujących w RKS Okęcie, zaoszczędzenie środków wydawanych na wynajem boisk zewnętrznych oraz poprawienie warunków treningowych - treningi na własnym obiekcie, na naturalnej trawie zamiast na sztucznych, wynajmowanych orlikach.",
      "Renowacja rozwiązuje również problem organizacji meczów rozgrywanych jako gospodarz we wszystkich kategoriach wiekowych. Dotychczas do dyspozycji było tylko jedno pełnowymiarowe boisko oraz małe boisko typu orlik, na których nieraz musiało odbyć się 14 meczów w weekend. Dodatkowe boisko z oświetleniem otwiera nowe możliwości: utworzenie nowych grup treningowych, zwiększenie efektywności treningów i pełniejsze wykorzystanie potencjału klubu.",
    ],
  },
  {
    name: "Odbudowa bazy treningowej (Pomoc doraźna)",
    funding: "20 000 zł",
    paragraphs: [
      "Renowacja boiska rozwiązała problemy z treningami oraz wpłynęła na zwiększenie potencjału treningowego i większą efektywność w realizacji celów statutowych klubu. Codzienne obłożenie boiska treningami i meczami powodowało problemy z jakością murawy, a po okresie jesienno-zimowym pojawiły się ubytki, dziury i nierówności - zwłaszcza na głównej płycie boiska.",
      "W ramach działań wykonano: kompleksową aerację liniową boiska w dwóch przejazdach na krzyż, piaskowanie, szczotkowanie, włókowanie i wczesanie piasku, aerację tłokową, dosiew wgłębny trawy w dwóch kierunkach, uzupełnienie największych ubytków w polach bramkowych trawą naturalną oraz nawożenie i opryski grzybobójcze i chwastobójcze.",
      "Poprawiona została jakość murawy, a zawodnikom zapewniono bezpieczne i optymalne warunki treningowe. Prace pozwoliły na pełne wykorzystanie boisk i prowadzenie treningów bez wynajmu obiektów zewnętrznych w okresie wiosna-lato-jesień, co bezpośrednio przełożyło się na podniesienie standardu działań klubu i większe zaangażowanie uczestników.",
    ],
  },
];

export default function NiwCrsoPage() {
  return (
    <>
      <PageHeader
        title="NIW-CRSO"
        description="Projekty RKS Okęcie Warszawa dofinansowane ze środków Narodowego Instytutu Wolności - Centrum Rozwoju Społeczeństwa Obywatelskiego."
      />
      <section className="container-page py-12">
        <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr]">
          <div className="rounded-[24px] border border-white/8 bg-card p-8 lg:self-start">
            <div className="rounded-[16px] bg-white p-6">
              <Image
                src="/images/partners/niw.png"
                alt="Narodowy Instytut Wolności - Centrum Rozwoju Społeczeństwa Obywatelskiego"
                width={300}
                height={150}
                className="mx-auto object-contain"
              />
            </div>
            <p className="mt-6 text-sm leading-7 text-muted-foreground">
              Rozwój infrastruktury treningowej przy Radarowej jest
              współfinansowany ze środków Narodowego Instytutu Wolności -
              Centrum Rozwoju Społeczeństwa Obywatelskiego.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <a href="https://niw.gov.pl/" target="_blank" rel="noopener noreferrer">
                Strona NIW
              </a>
            </Button>
          </div>

          <div className="grid gap-6">
            {niwProjects.map((project) => (
              <article
                key={project.name}
                className="rounded-[24px] border border-white/8 bg-card p-6"
              >
                <p className="text-sm font-black uppercase text-primary">
                  Nazwa projektu
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  {project.name}
                </h2>
                <p className="mt-3 text-sm font-bold text-white">
                  Wartość dofinansowania:{" "}
                  <span className="text-primary">{project.funding}</span>
                </p>
                <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
                  {project.paragraphs.map((paragraph) => (
                    <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
