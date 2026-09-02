import { SignIn } from "@clerk/nextjs";
import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: {
    absolute: "Logowanie | RKS Workspace",
  },
};

export default function AdminSignInPage() {
  return (
    <main className="admin-shell grid min-h-[100dvh] bg-[#f3f5f8] lg:grid-cols-[minmax(340px,0.85fr)_1.15fr]">
      <section className="relative hidden overflow-hidden bg-[#102a43] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-x-0 top-0 h-1 bg-[#d8ff3e]" />
        <div className="flex items-center gap-4">
          <Image
            src="/images/figma/crest-rks.png"
            alt="RKS Okęcie Warszawa"
            width={56}
            height={56}
            priority
          />
          <div>
            <p className="text-base font-black">RKS Workspace</p>
            <p className="text-sm text-slate-400">Panel zarządzania klubem</p>
          </div>
        </div>

        <div className="max-w-md">
          <p className="text-4xl font-black leading-[1.08] tracking-[-0.035em]">
            Wszystkie dane klubu w jednym miejscu.
          </p>
          <p className="mt-5 max-w-sm text-sm leading-7 text-slate-300">
            Zarządzaj treściami, zespołami, meczami i dokumentami w bezpiecznym panelu połączonym z Convex.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <ShieldCheck aria-hidden="true" size={18} strokeWidth={1.8} />
          Dostęp tylko dla uprawnionych administratorów
        </div>
      </section>

      <section className="flex min-h-[100dvh] items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <Image
              src="/images/figma/crest-rks.png"
              alt="RKS Okęcie Warszawa"
              width={44}
              height={44}
              priority
            />
            <div>
              <p className="text-sm font-black text-[#14263a]">RKS Workspace</p>
              <p className="text-xs text-[#5f6e80]">Panel zarządzania</p>
            </div>
          </div>
          <SignIn
            fallbackRedirectUrl="/admin"
            appearance={{
              variables: {
                colorPrimary: "#183f63",
                colorForeground: "#14263a",
                colorMutedForeground: "#5f6e80",
                borderRadius: "0.75rem",
                fontFamily: "var(--font-geist-sans)",
              },
              elements: {
                rootBox: "w-full",
                cardBox: "w-full shadow-none",
                card: "w-full border border-[#dce3eb] shadow-[0_18px_50px_rgba(16,42,67,0.10)]",
              },
            }}
          />
        </div>
      </section>
    </main>
  );
}
