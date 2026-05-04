import type { NextConfig } from "next";

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
      {
        source: "/przekaz-15-podatku-na-rozwoj-rks-okecie-warszawa-krs-0000021958",
        destination: "/wspieraj",
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
    ];
  },
};

export default nextConfig;
