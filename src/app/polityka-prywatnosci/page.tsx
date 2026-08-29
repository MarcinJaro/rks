import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { clubInfo } from "@/data/site";

export const metadata: Metadata = {
  title: "Polityka prywatności i cookies",
  description:
    "Zasady przetwarzania danych osobowych i wykorzystywania plików cookies na stronie RKS Okęcie Warszawa.",
};

const sections: { heading: string; paragraphs: React.ReactNode[] }[] = [
  {
    heading: "1. Administrator danych",
    paragraphs: [
      <>
        Administratorem danych osobowych jest Robotniczy Klub Sportowy
        „Okęcie&rdquo; z siedzibą w Warszawie, {clubInfo.address}, wpisany do
        Krajowego Rejestru Sądowego pod numerem KRS 0000021958. Kontakt z
        administratorem: telefonicznie {clubInfo.phone} lub przez dane podane na
        stronie{" "}
        <Link href="/kontakt" className="font-bold text-accent underline">
          Kontakt
        </Link>
        .
      </>,
    ],
  },
  {
    heading: "2. Jakie dane przetwarzamy",
    paragraphs: [
      "Przeglądanie strony nie wymaga zakładania konta ani podawania danych osobowych. W związku z utrzymaniem serwisu przetwarzane są standardowe dane techniczne (m.in. adres IP, dane o przeglądarce) zapisywane w logach infrastruktury hostingowej — wyłącznie w celu zapewnienia bezpieczeństwa i prawidłowego działania strony (art. 6 ust. 1 lit. f RODO).",
      "Jeżeli kontaktujesz się z klubem telefonicznie, mailowo lub przez media społecznościowe, przetwarzamy dane podane w tej korespondencji w celu obsługi sprawy (art. 6 ust. 1 lit. f RODO).",
    ],
  },
  {
    heading: "3. Formularz akceptacji regulaminu",
    paragraphs: [
      <>
        Na stronie{" "}
        <Link
          href="/zawodnik/regulamin"
          className="font-bold text-accent underline"
        >
          akceptacji regulaminu
        </Link>{" "}
        rodzic lub opiekun prawny podaje swoje imię i nazwisko, numer PESEL,
        adres e-mail, opcjonalnie numer telefonu oraz imię, nazwisko, numer
        PESEL i rocznik dziecka. Zapisujemy również datę złożenia oświadczenia
        i wersję dokumentów, których ono dotyczyło. Numery PESEL służą
        wyłącznie jednoznacznej identyfikacji zawodnika i opiekuna w
        dokumentacji członkowskiej klubu.
      </>,
      "Dane te przetwarzamy wyłącznie po to, aby udokumentować zapoznanie się z Regulaminem Klubu i Polityką ochrony dzieci — na podstawie art. 6 ust. 1 lit. b RODO (czynności związane z uczestnictwem dziecka w zajęciach) oraz art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes klubu, jakim jest możliwość wykazania złożonych oświadczeń). Nie wykorzystujemy ich do wysyłki marketingowej.",
      "Oświadczenia przechowujemy przez czas uczestnictwa dziecka w zajęciach klubu oraz przez okres przedawnienia ewentualnych roszczeń, a następnie je usuwamy. Dostęp do nich mają wyłącznie imiennie wskazane osoby z zarządu i biura klubu.",
    ],
  },
  {
    heading: "4. Wizerunek — zdjęcia i transmisje z meczów",
    paragraphs: [
      "W serwisie publikujemy relacje foto i wideo z meczów, turniejów i innych publicznych wydarzeń klubowych. Wizerunek osób stanowiących element większej całości (drużyna, publiczność, przebieg zawodów) rozpowszechniany jest na podstawie art. 81 ust. 2 ustawy o prawie autorskim i prawach pokrewnych oraz prawnie uzasadnionego interesu klubu, jakim jest dokumentowanie i promocja działalności sportowej (art. 6 ust. 1 lit. f RODO). W przypadku zawodników niepełnoletnich klub odbiera zgody opiekunów w ramach dokumentacji członkowskiej.",
      <>
        Jeśli chcesz, aby konkretne zdjęcie z Twoim wizerunkiem zostało usunięte
        ze strony, napisz do nas — dane kontaktowe znajdziesz na stronie{" "}
        <Link href="/kontakt" className="font-bold text-accent underline">
          Kontakt
        </Link>
        . Wniosek zrealizujemy bez zbędnej zwłoki.
      </>,
    ],
  },
  {
    heading: "5. Pliki cookies",
    paragraphs: [
      "Strona nie korzysta z cookies marketingowych ani analitycznych i nie profiluje odwiedzających. Wykorzystywane są wyłącznie pliki niezbędne do działania serwisu, w tym cookies uwierzytelniające panel administracyjny (dotyczą wyłącznie administratorów strony, nie odwiedzających).",
      "Osadzone materiały zewnętrzne (np. transmisje i miniatury z serwisu YouTube, treści przeniesione z Facebooka) po przejściu do serwisu zewnętrznego podlegają politykom prywatności ich operatorów (Google/YouTube, Meta).",
    ],
  },
  {
    heading: "6. Odbiorcy danych",
    paragraphs: [
      "Dane techniczne przetwarzane są przez dostawców infrastruktury działających na zlecenie klubu: Vercel Inc. (hosting strony), Convex Inc. (baza danych serwisu) oraz Clerk Inc. (logowanie do panelu administracyjnego). Dostawcy ci mogą przetwarzać dane poza Europejskim Obszarem Gospodarczym w oparciu o standardowe klauzule umowne.",
    ],
  },
  {
    heading: "7. Twoje prawa",
    paragraphs: [
      "Masz prawo dostępu do swoich danych, ich sprostowania, usunięcia, ograniczenia przetwarzania oraz wniesienia sprzeciwu wobec przetwarzania opartego na prawnie uzasadnionym interesie. Przysługuje Ci również skarga do Prezesa Urzędu Ochrony Danych Osobowych (uodo.gov.pl).",
      "Dokument obowiązuje od 10 sierpnia 2026 r., ostatnia aktualizacja 25 sierpnia 2026 r. Może być aktualizowany wraz z rozwojem serwisu.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <>
      <PageHeader
        title="Polityka prywatności"
        description="Zasady przetwarzania danych osobowych, publikacji wizerunku i wykorzystywania plików cookies w serwisie RKS Okęcie Warszawa."
      />
      <section className="container-page py-12">
        <div className="mx-auto grid max-w-3xl gap-6">
          {sections.map((section) => (
            <article
              key={section.heading}
              className="rounded-[24px] border border-white/8 bg-card p-8"
            >
              <h2 className="mb-4 text-lg font-black text-white">
                {section.heading}
              </h2>
              <div className="space-y-4 text-sm leading-7 text-muted-foreground">
                {section.paragraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
