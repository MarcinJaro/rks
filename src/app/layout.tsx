import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { SiteChrome } from "@/components/layout/SiteChrome";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://rksokecie.pl"),
  alternates: {
    canonical: "./",
  },
  title: {
    default: "RKS Okęcie Warszawa",
    template: "%s | RKS Okęcie Warszawa",
  },
  description:
    "Oficjalna strona RKS Okęcie Warszawa: aktualności, drużyny, mecze, szkolenie i kontakt do klubu.",
  openGraph: {
    title: "RKS Okęcie Warszawa",
    description:
      "Aktualności, drużyny, mecze i życie klubu przy ul. Radarowej 1.",
    url: "https://rksokecie.pl",
    siteName: "RKS Okęcie Warszawa",
    locale: "pl_PL",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" data-scroll-behavior="smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppProviders>
          <SiteChrome>{children}</SiteChrome>
        </AppProviders>
      </body>
    </html>
  );
}
