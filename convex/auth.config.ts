// Podczas przełączania Clerka z instancji deweloperskiej na produkcyjną obie
// muszą być akceptowane jednocześnie: front na Vercelu i backend Convex nie
// przełączają się w tej samej sekundzie. Po ustabilizowaniu produkcji można
// usunąć CLERK_JWT_ISSUER_DOMAIN_LEGACY.
const issuers = [
  ...new Set(
    [
      process.env.CLERK_JWT_ISSUER_DOMAIN,
      process.env.CLERK_JWT_ISSUER_DOMAIN_LEGACY,
    ].filter((domain): domain is string => Boolean(domain)),
  ),
];

const authConfig = {
  providers: issuers.map((domain) => ({ domain, applicationID: "convex" })),
};

export default authConfig;
