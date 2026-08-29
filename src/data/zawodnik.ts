import { clubShop } from "./site";
import { recruitmentBirthYearThreshold } from "@/lib/season";

export type ContentLink = {
  label: string;
  href: string;
  external?: boolean;
};

/**
 * Stroje meczowe zamawia się mailowo w klubie, resztę asortymentu kupuje się
 * w fanshopie NO10. Kwota dotyczy kompletu meczowego.
 */
export const kitInfo = {
  orderEmail: "stroje@rksokecie.pl",
  matchKitPrice: "320 zł",
  orderFields: [
    "imię i nazwisko dziecka",
    "numer zawodnika (ustalony z trenerem)",
    "rozmiar",
  ],
  fanshopItems: ["getry", "dresy", "koszulki treningowe"],
  fanshopHref: clubShop.href,
  trainingRule:
    "Na treningach obowiązują tylko i wyłącznie stroje RKS Okęcie.",
};

export const goalkeeperTraining = {
  coach: "Karol Gębski",
  phone: "502 211 208",
};

export type TrainingProvider = {
  brand: string;
  coaches: { name: string; phone: string }[];
  focus: string;
};

/**
 * Treningi indywidualne prowadzą marki trenerskie współpracujące z klubem.
 * Rozliczenie zależy od tego, czy dziecko jest zawodnikiem RKS - patrz
 * individualTrainingBilling.
 */
export const individualTrainingProviders: TrainingProvider[] = [
  {
    brand: "Skill Up",
    coaches: [
      { name: "Maciej Kilman", phone: "668 149 853" },
      { name: "Karol Kuza", phone: "731 055 549" },
    ],
    focus: "Treningi techniczne, metodyka Coerver",
  },
  {
    brand: "Football Tigers Center",
    coaches: [{ name: "Artur Bartosiński", phone: "519 685 935" }],
    focus: "Technika, motoryka",
  },
  {
    brand: "Fundamental Motor Skills",
    coaches: [{ name: "Karol Niziołek", phone: "793 746 625" }],
    focus: "Technika, motoryka",
  },
];

export const individualTrainingBilling = [
  {
    who: "Zawodnicy RKS Okęcie",
    rule: "Rozliczenie za treningi odbywa się na konto klubowe.",
  },
  {
    who: "Zawodnicy spoza klubu",
    rule: "Rozliczenie odbywa się bezpośrednio z trenerem prowadzącym.",
  },
];

/**
 * Klubowy formularz zgłoszeniowy prowadzony w ProTrainUp. Adres zawiera
 * podpis wygenerowany przez system - bez niego formularz się nie otworzy.
 */
export const PROTRAINUP_SIGNUP_FORM =
  "https://rksokecie.protrainup.com/pl/forms/351?signature=f8cba9c5eba54c88216209b95caa90d25d8d4db2ffd1d3a597b9d3ad4711c2d4";

export type RecruitmentStep = {
  title: string;
  body?: string;
  /** Dopisek zawężający krok, np. do konkretnych roczników. */
  note?: string;
  /** Wyróżniony warunek, którego pominięcie blokuje grę w rozgrywkach. */
  emphasis?: string;
  links?: ContentLink[];
};

// Próg wieku liczony z sezonu - patrz src/lib/season.ts.
const naborNote = `Dotyczy dzieci ur. ${recruitmentBirthYearThreshold()} i młodszych.`;

export const recruitmentSteps: RecruitmentStep[] = [
  {
    title: "Zgoda „Zawodnik Naborowy”",
    body: "Wypełnioną zgodę trzeba przekazać trenerowi przed pierwszym treningiem.",
    note: naborNote,
    links: [
      {
        label: "Pobierz zgodę (PDF)",
        href: "/documents/zgoda-pierwszy-trening.pdf",
      },
    ],
  },
  {
    title: "Rejestracja w systemie Łączy Nas Piłka",
    body: "Rejestracja konta oraz zgłoszenie dziecka do Akademii RKS Okęcie.",
    note: naborNote,
    links: [
      {
        label: "laczynaspilka.pl",
        href: "https://www.laczynaspilka.pl/strona-glowna",
        external: true,
      },
    ],
  },
  {
    title: "Formularz zgłoszeniowy",
    body: "Wypełnienie klubowego formularza zgłoszeniowego zawodnika w systemie ProTrainUp.",
    links: [
      {
        label: "Formularz zgłoszeniowy",
        href: PROTRAINUP_SIGNUP_FORM,
        external: true,
      },
    ],
  },
  {
    title: "Deklaracja Gry Amatora",
    body: "Wypełniony i podpisany dokument przekazywany trenerowi.",
    links: [
      {
        label: "Pobierz deklarację (PDF)",
        href: "/documents/deklaracja-gry-amatora.pdf",
      },
    ],
  },
  {
    title: "Badania lekarskie",
    body: "Kopia aktualnych badań stwierdzających brak przeciwwskazań do uprawiania sportu.",
  },
  {
    title: "Akceptacja Regulaminu Klubu",
    body: "Potwierdzenie zapoznania się z regulaminem przez formularz online.",
    links: [{ label: "Przejdź do formularza", href: "/zawodnik/regulamin" }],
  },
  {
    title: "Rejestracja w aplikacji mZawodnik",
    body: "Konto zawodnika w aplikacji mZawodnik.",
    emphasis:
      "Warunek konieczny do udziału w rozgrywkach. Dotyczy zawodników, którzy nie byli wcześniej zarejestrowani w MZPN.",
    links: [
      {
        label: "mZawodnik",
        href: "https://www.laczynaspilka.pl/mzawodnik/home",
        external: true,
      },
    ],
  },
];

export type HowToVideo = {
  title: string;
  url: string;
};

export const recruitmentVideos: HowToVideo[] = [
  {
    title:
      "Jak zgłosić dziecko do szkółki certyfikowanej na laczynaspilka.pl",
    url: "https://www.youtube.com/watch?v=X-rOzXqeKog",
  },
];
