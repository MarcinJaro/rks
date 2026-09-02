import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    absolute: "Panel administracyjny | RKS Workspace",
    template: null,
  },
  description: "Wewnętrzny panel zarządzania danymi RKS Okęcie Warszawa.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
  alternates: {
    canonical: null,
  },
  openGraph: null,
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
