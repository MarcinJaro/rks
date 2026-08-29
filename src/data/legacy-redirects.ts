// Przekierowania 301 ze starej strony Drupal (rksokecie.pl sprzed migracji).
// Wygenerowane z sitemap.xml starego serwisu (1610 URL-i, stan: 2026-08-09).
// Zasada: artykuly-newsy -> /aktualnosci, nabory/obozy -> /zawodnik, 1,5% -> /wspieraj,
// sekcje druzynowe -> odpowiednia strona /druzyny/[slug].

type Redirect = { source: string; destination: string; permanent: boolean };

// Stare slugi artykulow z poziomu glownego -> /aktualnosci
const articleSlugs: string[] = [
  "1-kolejka-ligowa-rks-okecie-warszawa-unia-ii-warszawa",
  "akademickie-mistrzostwa-polski-w-podnoszeniu-ciezarow-4-miejsce-marty-dawidowskiej",
  "bieg-pamieci-wlochy-44",
  "bilgoraj-2020-r-mlodziezowe-mistrzostwa-polski-do-lat-23-brazowy-medal-marty-dawidowskiej",
  "bukmacher-forbet-wspiera-nasz-klub",
  "ciezarowcy-piotr-sosnowski-oraz-ryszard-sowinski-medalistami-zawodow-w-siedlcach",
  "ciezarowcy-rks-uczcili-na-sportowo-102-rocznice-niepodleglosci-polski",
  "dziekujemy-za-wyslanie-formularza",
  "ewokacja-z-posiedzenia-komisji-sportu-dzielnicy-wlochy-nt-rks-okecie-warszawa",
  "extranet-dla-klubow",
  "gdansk-mistrzostwa-polski-do-lat-20-brazowy-medal-piotr-sosnowski-i-6-m-ce-ryszard-sowinski",
  "gks-swit-warszawa-rks-okecie-warszawa-1-2",
  "informacja-na-temat-terenu-rks-okecie",
  "informacja-o-zawieszeniu-treningow-i-rozgrywek",
  "informacja-zarzadu-rks-okecie-w-sprawie-oplat-w-klubie",
  "jest-26vi1955-roku-w-ringu-walczy-zawodnik-okecia-pan-tadeusz-kwiatkowski",
  "joma-partnerem-technicznym-rks-okecie-warszawa",
  "karol-zamosny-vice-mistrzem-polski-do-lat-15-w-podnoszeniu-ciezarow-katwagowa-96-kg",
  "keeza-klasa-b-20222023-grupa-warszawa-ii-4-wrzesnia-1100-okecie-ii-warszawa-3-6-victoria-zerzen",
  "kino-letnie-na-stadionie-rks-okecie",
  "kino-letnie-na-stadionie-rks-okecie-0",
  "komunika-w-sprawie-koronawirusa",
  "komunikat-rks-okecie",
  "komunikat-rks-okecie-0",
  "komunikat-w-sprawie-skladek-na-rzecz-klubu",
  "komunikat-w-sprawie-wznowienia-treningow",
  "krotkie-podsumowanie-zespolow-mlodziezowych-rks-okecie-warszawa-sezon-2018-r",
  "mistrzostwa-mazowsza-do-lat-15",
  "mistrzostwa-mazowsza-u-15-i-turniej-marszalka-wojewodztwa-maz-u-17-siedlce-21-09-2019",
  "mistrzostwa-mazowsza-u-17-w-podnoszeniu-ciezarow-1-miejsce-ryszard-sowinski",
  "mistrzostwa-polski-do-lat-17-i-oom-w-podnoszeniu-ciezarow-srebrny-medal-karol-zamosny",
  "mistrzostwa-polski-juniorek-w-podnoszeniu-ciezarow-6-miejsce-marty-dawidowskiej",
  "mistrzostwa-polski-mlodzikow-do-lat-15-d-cornienco-i-rsowinski",
  "mistrzostwa-polski-w-podnoszeniu-ciezarow-do-lat-15-nowy-tomysl-2020-r",
  "mistrzostwa-polski-w-podnoszeniu-ciezarow-do-lat-15-zapowiedz",
  "mistrzostwa-warszawy-do-lat-15-w-podnoszeniu-ciezarow",
  "mistrzostwa-warszawy-oldboy-i-na-bemowie-0",
  "mistrzostwa-warszawy-w-podnoszeniu-ciezarow-do-lat-17-oraz-mw-do-lat-15",
  "mistrzostwa-wojewodztwa-mazowieckiego-do-lat-17-siedlce",
  "mlodziez-rks-okecie-warszawa-w-rozgrywkach-mzpn-na-2018-r",
  "na-nwzc-klubu-wybrano-nowego-prezesa-i-5-nowych-czlonkow-zarzadu",
  "na-okeciu-graja-tez-panie-pierwszy-trening-pilkarek-na-r1",
  "nadzwyczajne-walne-zebranie-czlonkow-klubu",
  "nowa-strona-internetowa",
  "nowe-stroje",
  "nowe-szatnie-na-nowy-rok",
  "nowe-wladze-klubu",
  "nowe-wladze-w-rks-okecie-warszawa",
  "nowy-sponsor",
  "obchody-90-lecia-klubu",
  "obchody-90-lecia-klubu-podsumowanie",
  "oldboje-okecia-trenuja-i-graja",
  "ostatnie-mecze-w-sezonie-2018-zapowiedz",
  "oswiadczenie-w-sprawie-tzw-porozumienia-warszawskiego",
  "oswiadczenie-zarzadu-rks-okecie-w-sprawie-word",
  "otwarcie-nowego-boiska-podsumowanie-uroczystosci-z-2-wrzesnia-2023-r",
  "piotr-sosnowski-wyniki-i-sylwetka-ciezarowca-rks-okecie-warszawa",
  "plan-gier-naszych-zespolow-na-koniec-maja",
  "plan-gier-naszych-zespolow-na-weekend-2930-wrzesnia-2018-r",
  "plan-gier-naszych-zespolow-od-1-do-6-wrzesnia-2018-r",
  "plan-gier-naszych-zespolow-od-12-do-14-pazdziernika-2018-r",
  "plan-gier-naszych-zespolow-od-15-do-19-wrzesnia-2018-r",
  "plan-gier-naszych-zespolow-od-17-do-24-maja-2018-r",
  "plan-gier-naszych-zespolow-od-20-do-21-pazdziernika-2018-r",
  "plan-gier-naszych-zespolow-od-21-do-25-wrzesnia-2018-r-i-tance-na-r1",
  "plan-gier-naszych-zespolow-od-27-do-29-pazdziernika-2018-r",
  "plan-gier-naszych-zespolow-od-3-do-4-listopada-2018-r",
  "plan-gier-naszych-zespolow-od-6-do-14-maja-2018-r",
  "plan-gier-naszych-zespolow-od-8-do-12-wrzesnia-2018-r",
  "plan-gier-naszych-zespolow-w-weekendy-67-pazdziernika-oraz-1314-pazdziernika",
  "podnoszenie-ciezarow-mistrzostwa-okregu-do-23-lat",
  "podsumowanie-pierwszego-roku-wspolpracy-z-naszym-glownym-sponsorem-firma-hyundai-motortest",
  "podzial-grup-w-lo-rks-okecie-zagra-w-warszawa-ii",
  "potrzebna-krew-dla-23-letniej-pauliny-bremer-corki-pilkarza-oldboji-gracjana",
  "praca-zatrudnimy-kierownika-administracyjnego-klubu",
  "prosba-o-pomoc",
  "reaktywacja-druzyny-oldboy-i-na-2018-r",
  "rekordy-ciezarowcow-gawlowskiego-i-zamosnego-na-mistrzostwach-w-siedlcach",
  "relacja-foto-i-video-z-61-turnieju-im-aleksandra-zaranka",
  "relacja-sportowa-z-61-turnieju-im-aleksandra-zaranka",
  "reprezentacja-polski-trenuje-na-boisku-rks-okecie",
  "rks-okecie-warszawa-na-twitterze",
  "rks-okecie-z-brazowym-certyfikatem-pzpn",
  "slub-michala-luczyka-z-wiktoria-pawlinska",
  "sparingi-zespolow-ligi-okregowej-warszawa-ii-4",
  "sprawdz-jak-w-ostatni-weekend-poradzili-sobie-nasi-mlodzi-pilkarze",
  "szczegolowe-wytyczne-w-zakresie-prowadzenia-zajec-okresie-pandemi-covid-19",
  "sztangista-okecia-arkadiusz-domanski-czwarty-w-xxxi-miedzynarodowych-mistrzostwa-polski-masters",
  "sztangista-rks-okecie-arkadiusz-domanski-mistrzem-polski-zloty-medal-zdobyl-na-xxxii",
  "szukamy-trenerow",
  "traktor-do-koszenia-boiska-zrzutkapl",
  "walczymy-o-przetrwanie-na-sportowej-mapie-warszawy",
  "walne-zebranie-czlonkow-robotniczego-klubu-sportowego-okecie-z-siedziba-w-warszawie",
  "walne-zebranie-sprawozdawcze-czlonkow-klubu",
  "walne-zebranie-sprawozdawcze-czlonkow-klubu-0",
  "walne-zebranie-sprawozdawcze-czlonkow-klubu-1",
  "walne-zebranie-sprawozdawczo-wyborcze-czlonkow-klubu",
  "wesolych-i-spokojnych-swiat-i-szczesliwego-nowego-roku",
  "wesolych-i-spokojnych-swiat-oraz-szczesliwego-nowego-roku",
  "wesolych-i-zdrowych-swiat-bozego-narodzenia-oraz-szczesliwego-nowego-roku",
  "wesolych-swiat-bozego-narodzenia-i-szczesliwego-nowego-roku-2020",
  "wesolych-swiat-i-szczesliwego-nowego-roku",
  "wesolych-swiat-i-szczesliwego-nowego-roku-0",
  "wesolych-swiat-i-szczesliwego-nowego-roku-1",
  "wiosna-2018-r-mlodziez-u-17-u-14-u-12-i-u-11-poznala-rywali",
  "wracamy-do-treningow",
  "wygrana-i-przegrana-mlodzikow-oraz-2-zwyciestwa-zakow-w-niedzielnych-meczach-naszej-mlodziezy",
  "wyniki-naszych-zespolow-od-10-do-13-maja-2019-r",
  "wyniki-naszych-zespolow-od-15-do-19-wrzesnia",
  "wyniki-naszych-zespolow-od-20-do-22-pazdziernika",
  "wyniki-naszych-zespolow-od-21-do-23-wrzesnia",
  "wyniki-naszych-zespolow-od-23-do-31-marca-2019-r",
  "wyniki-naszych-zespolow-od-27-do-28-pazdziernika",
  "wyniki-naszych-zespolow-od-29-do-2-pazdziernika",
  "wyniki-naszych-zespolow-od-6-do-8-pazdziernika",
  "zapraszamy-mlodych-atletow-do-sekcji-podnoszenia-ciezarow-w-rks-okecie",
  "zapraszamy-na-piknik-naukowo-sportowy-15-czerwca-sobota",
  "zapytanie-ofertowe-budowa-boiska-ze-sztuczna-nawierzchnia-i-oswietleniem",
  "zapytanie-ofertowe-na-projekt-boiska-ze-sztuczna-nawierzchnia-i-oswietleniem",
  "zapytanie-ofertowe-na-wykonanie-oswietlania-glownej-plyty-stadionu",
  "zarzad-rks-okecie-warszawa-z-absolutorium-za-2017-rok",
  "zasady-dotyczace-udzialu-publicznosci-podczas-meczow",
  "zimowy-turniej-pilkarski-im-aleksandra-zaranka",
  "zmarl-andrzej-mlacki",
  "zmarl-bogdan-owczarczyk-lekarz-i-dzialacz-w-rks-okecie",
  "zmarl-krzysztof-stepien-byly-pilkarz-a-pozniej-dzialacz-oraz-kibic-rks-okecie-warszawa",
  "zmarl-ryszard-marcinkowski",
  "zmarl-ryszard-pietka-trener-i-wychowawca-mlodziezy-w-rks-okecie",
  "zmiana-wysokosci-oplat-czlonkowskich",
  "zyczenia-swiateczne",
  "zyczenia-wielkanocne",
  "zyczenia-wielkanocne-0",
  "zyczenia-wielkanocne-1",
  "zyczenia-wielkanocne-2",
  "zyczenia-wielkanocne-3",
  "zyczenia-wielkanocne-4",
  "zyczenia-wielkanocne-5",
  "zywa-legenda-sekcji-podnoszenia-ciezarow-pan-boguslaw-maliszewski-trener-czlonek-zarzadu-rks-okecie",
];

// Nabory, obozy, polkolonie -> /zawodnik
const recruitmentSlugs: string[] = [
  "formularz-zgloszeniowy-oboz",
  "nabor-do-sekcji-podnoszenie-ciezarow-w-rks-okecie-warszawa",
  "nabor-do-sekcji-podnoszenie-ciezarow-w-rks-okecie-warszawa-0",
  "nabor-dzieci-do-naszego-klubu",
  "nabor-dzieci-do-sekcji-do-pilki-noznej",
  "nabor-dzieci-do-sekcji-pilki-noznej",
  "nabor-dzieci-do-sekcji-pilki-noznej-0",
  "nabor-dzieci-do-sekcji-pilki-noznej-1",
  "nabor-uzupelniajacy-do-rocznikow-2001-2004-2005-2006-20072008-20092010-oraz-2011-i-mlodsi",
  "nabor-uzupelniajacy-do-rocznikow-2004-2005-2006-i-20072008",
  "nabory-uzupelniajace",
  "nowy-patron-szkolki-pilkarskiej-przedstawiamy-firme-kontomatik",
  "oboz-w-ustroniu-morskim-2024-formularz-zgloszeniowy",
  "oboz-zimowy-w-piszu-2024",
  "obozy-dochodzeniowe-okecie-summer-camp",
  "oldboje-nabor-do-zespolu-na-2018-r",
  "polkolonie-pilkarskie",
  "rks-okecie-rekrutuje",
  "zapraszamy-dzieci-i-mlodziez-do-szkolki-pilkarskiej-rks-okecie",
];

// Przekaz 1%/1,5% podatku -> /wspieraj
const donationSlugs: string[] = [
  "przekaz-1-podatku-na-rks-okecie-warszawa-krs-0000021958",
  "przekaz-1-podatku-na-rozwoj-rks-okecie-warszawa-krs-0000021958",
  "przekaz-1-podatku-na-rozwoj-rks-okecie-warszawa-krs-0000021958-0",
  "przekaz-1-podatku-na-rozwoj-rks-okecie-warszawa-krs-0000021958-2019",
  "przekaz-15-podatku-na-rozwoj-rks-okecie-warszawa-krs-0000021958",
];

// Sekcje druzynowe starego serwisu -> aktualne strony druzyn.
// Klucz: pierwszy segment starej sciezki, wartosc: slug w /druzyny/.
const teamSectionMap: Record<string, string> = {
  "seniorzy-liga-okregowa": "seniorzy",
  "seniorzy-a-klasa": "seniorzy",
  "seniorzy-v-liga": "seniorzy",
  "seniorzy-iv-liga": "seniorzy",
  "seniorzy-ii-b-klasa": "seniorzy2",
  seniorzy: "seniorzy",
  seniorzy2: "seniorzy2",
  oldboy: "oldboy",
  oldboye: "oldboy",
  "oldboy-weterani": "oldboy",
  "rocznik-2010": "rocznik-2010",
  "rocznik-2010-a": "rocznik-2010",
  "rocznik-2012": "rocznik-2012",
  "rocznik-2013": "rocznik-2013",
  "rocznik-20132014": "rocznik-2013",
  "rocznik-2013-i-mlodsi": "rocznik-2013",
  "rocznik-2014": "rocznik-2014",
  "rocznik-2015": "rocznik-2015",
  "rocznik-2015-i-mlodsi": "rocznik-2015",
  "rocznik-2016": "rocznik-2016",
  "rocznik-2017": "rocznik-2017",
  "rocznik-2017-i-mlodsi": "rocznik-2017",
  "rocznik-2018": "rocznik-2018",
  "rocznik-2018-i-mlodsi": "rocznik-2018",
  "rocznik-2019": "rocznik-2019",
  "rocznik-2020": "rocznik-2020",
  "rocznik-2020-i-mlodsi": "rocznik-2020",
};

// Artykuly sezonu 2025/26 zmigrowane 1:1 do /aktualnosci/[slug]
// (scripts/import-legacy-articles.mjs) - przekierowanie na dokladny odpowiednik.
const migratedArticlePaths: string[] = [
  "seniorzy-liga-okregowa/30-kol-lo-grupa-ii",
  "seniorzy-liga-okregowa/29-kol-lo-grupa-ii",
  "walne-zebranie-czlonkow-robotniczego-klubu-sportowego-okecie-z-siedziba-w-warszawie",
  "seniorzy-liga-okregowa/28-kol-lo-grupa-ii",
  "seniorzy-liga-okregowa/27-kol-lo-grupa-ii",
  "seniorzy-liga-okregowa/17-kol-lo-grupa-ii",
  "seniorzy-liga-okregowa/26-kol-lo-grupa-ii",
  "seniorzy-liga-okregowa/25-kol-lo-grupa-ii",
  "seniorzy-liga-okregowa/24-kol-lo-grupa-ii",
  "seniorzy-liga-okregowa/23-kol-lo-grupa-ii",
  "seniorzy-liga-okregowa/16-kol-lo-grupa-ii",
  "seniorzy-liga-okregowa/22-kol-lo-grupa-ii",
  "seniorzy-liga-okregowa/21-kol-lo-grupa-ii",
  "seniorzy-liga-okregowa/20-kol-lo-grupa-ii",
  "seniorzy-liga-okregowa/19-kol-lo-grupa-ii",
  "seniorzy-liga-okregowa/18-kol-lo-grupa-ii",
  "seniorzy-liga-okregowa/sparing-nr7",
  "seniorzy-liga-okregowa/sparing-nr6",
  "seniorzy-liga-okregowa/sparing-nr5",
  "seniorzy-liga-okregowa/sparing-nr4",
  "seniorzy-liga-okregowa/sparing-nr3",
  "seniorzy-liga-okregowa/sparing-nr2",
  "seniorzy-liga-okregowa/sparing-nr1",
  "seniorzy-liga-okregowa/rks-okecie-zakonczyl-runde-jesienna-na-podium-znamy-plan-zimowych-przygotowan",
  "seniorzy-liga-okregowa/15-kol-lo-grupa-ii",
  "seniorzy-liga-okregowa/14-kol-lo-grupa-ii",
  "seniorzy-liga-okregowa/13-kol-lo-grupa-ii",
  "seniorzy-liga-okregowa/12-kol-lo-grupa-ii",
  "seniorzy-liga-okregowa/11-kol-lo-grupa-ii",
  "seniorzy-liga-okregowa/10-kol-lo-grupa-ii",
  "seniorzy-liga-okregowa/9-kol-lo-grupa-ii",
  "seniorzy-liga-okregowa/8-kol-lo-grupa-ii",
  "seniorzy-liga-okregowa/7-kol-lo-grupa-ii",
  "seniorzy-liga-okregowa/1-kol-lo-grupa-ii-0",
  "seniorzy-liga-okregowa/6-kol-lo-grupa-ii",
  "seniorzy-liga-okregowa/okregowy-puchar-polski-iv-runda-202526",
  "seniorzy-liga-okregowa/5-kol-lo-grupa-ii",
  "seniorzy-liga-okregowa/okregowy-puchar-polski-iii-runda-202526",
  "seniorzy-liga-okregowa/4-kol-lo-grupa-ii",
  "seniorzy-liga-okregowa/3-kol-lo-grupa-ii",
  "seniorzy-liga-okregowa/1-kol-lo-grupa-ii",
  "seniorzy-liga-okregowa/kadra-rks-okecia-w-sezonie-20252026-lo-grupa-ii-kto-przyszedl-kogo-nie-ma",
  "seniorzy-liga-okregowa/mecz-sparingowy-nr4-lato-2025-r",
  "seniorzy-liga-okregowa/mecz-sparingowy-nr3-lato-2025-r",
  "seniorzy-liga-okregowa/mecz-sparingowy-nr2-lato-2025-r",
  "seniorzy-liga-okregowa/mecz-sparingowy-nr1-lato-2025-r",
];

export function buildLegacyRedirects(): Redirect[] {
  const redirects: Redirect[] = [];

  // Najpierw dopasowania 1:1 zmigrowanych artykulow - musza wyprzedzac
  // wildcardy sekcji druzynowych.
  for (const path of migratedArticlePaths) {
    redirects.push({
      source: `/${path}`,
      destination: `/aktualnosci/${path.split("/").pop()}`,
      permanent: true,
    });
  }

  for (const [oldSection, teamSlug] of Object.entries(teamSectionMap)) {
    redirects.push(
      {
        source: `/${oldSection}`,
        destination: `/druzyny/${teamSlug}`,
        permanent: true,
      },
      {
        source: `/${oldSection}/:path*`,
        destination: `/druzyny/${teamSlug}`,
        permanent: true,
      },
    );
  }

  // Roczniki bez aktualnej druzyny (2001-2011, warianty a/b itd.) -> lista druzyn.
  // Musi byc PO wpisach z teamSectionMap - pierwsze dopasowanie wygrywa.
  redirects.push(
    { source: "/rocznik-:slug/:path*", destination: "/druzyny", permanent: true },
    { source: "/rocznik-:slug", destination: "/druzyny", permanent: true },
  );

  // Stara strona akceptacji regulaminu ma bezpośredni odpowiednik.
  redirects.push({
    source: "/akceptacja-regulaminu",
    destination: "/zawodnik/regulamin",
    permanent: true,
  });

  for (const slug of articleSlugs) {
    redirects.push({
      source: `/${slug}`,
      destination: "/aktualnosci",
      permanent: true,
    });
  }
  for (const slug of recruitmentSlugs) {
    redirects.push({
      source: `/${slug}`,
      destination: "/zawodnik",
      permanent: true,
    });
  }
  for (const slug of donationSlugs) {
    redirects.push({
      source: `/${slug}`,
      destination: "/wspieraj",
      permanent: true,
    });
  }

  return redirects;
}
