import type { NextConfig } from "next";
import { buildLegacyRedirects } from "./src/data/legacy-redirects";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.convex.cloud",
      },
      {
        protocol: "https",
        hostname: "*.convex.site",
      },
      {
        protocol: "https",
        hostname: "rksokecie.pl",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/historia", destination: "/klub/historia", permanent: true },
      { source: "/stadion", destination: "/klub/stadion", permanent: true },
      {
        source: "/zarzad-klubu",
        destination: "/klub/zarzad",
        permanent: true,
      },
      {
        source: "/sztab-szkoleniowy",
        destination: "/klub/sztab",
        permanent: true,
      },
      {
        source: "/certyfikacja-pzpn",
        destination: "/klub/certyfikacja-pzpn",
        permanent: true,
      },
      { source: "/dla-rodzicow", destination: "/rodzice", permanent: true },
      { source: "/reklama", destination: "/wspieraj", permanent: true },
      { source: "/niw-crso", destination: "/klub/niw-crso", permanent: true },
      { source: "/strona-glowna", destination: "/", permanent: true },
      { source: "/archiwum", destination: "/aktualnosci", permanent: true },
      { source: "/szatnie", destination: "/klub/stadion", permanent: true },
      {
        source: "/polityka-plikow-cookies",
        destination: "/polityka-prywatnosci",
        permanent: true,
      },
      {
        source: "/strefa-kibica/spiewnik",
        destination: "/kibice/spiewnik",
        permanent: true,
      },
      {
        source: "/strefa-kibica/legendy-rks-okecie",
        destination: "/kibice/historia",
        permanent: true,
      },
      {
        source: "/strefa-kibica/zasluzeni-dla-rks-okecie",
        destination: "/kibice/historia",
        permanent: true,
      },
      {
        source: "/strefa-kibica/kalendarz-sportowy",
        destination: "/wyniki",
        permanent: true,
      },
      {
        source: "/strefa-kibica/historia-ruchu-kibicowskiego",
        destination: "/kibice/historia",
        permanent: true,
      },
      { source: "/strefa-kibica", destination: "/kibice", permanent: true },
      {
        source: "/strefa-kibica/:path*",
        destination: "/kibice",
        permanent: true,
      },
      { source: "/sekcja/:path*", destination: "/aktualnosci", permanent: true },
      { source: "/node/:path*", destination: "/aktualnosci", permanent: true },
      ...buildLegacyRedirects(),
    ];
  },
};

export default nextConfig;
