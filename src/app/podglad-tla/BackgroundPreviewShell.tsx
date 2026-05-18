"use client";

import { Check, Clipboard, Palette } from "lucide-react";
import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from "react";

type PreviewVariable =
  | "--background"
  | "--muted"
  | "--card"
  | "--border"
  | "--section"
  | "--section-alt"
  | "--chrome"
  | "--footer"
  | "--sponsor-bg"
  | "--hero-overlay-end"
  | "--hero-panel"
  | "--surface-raised"
  | "--team-card"
  | "--feed-card"
  | "--feed-media"
  | "--icon-blue"
  | "--sponsor-pill";

type PreviewVariant = {
  id: string;
  name: string;
  label: string;
  note: string;
  values: Record<PreviewVariable, string>;
};

const previewVariables: PreviewVariable[] = [
  "--background",
  "--muted",
  "--card",
  "--border",
  "--section",
  "--section-alt",
  "--chrome",
  "--footer",
  "--sponsor-bg",
  "--hero-overlay-end",
  "--hero-panel",
  "--surface-raised",
  "--team-card",
  "--feed-card",
  "--feed-media",
  "--icon-blue",
  "--sponsor-pill",
];

const previewVariants: PreviewVariant[] = [
  {
    id: "original",
    name: "Obecne",
    label: "0",
    note: "Punkt odniesienia",
    values: {
      "--background": "#050913",
      "--muted": "#0b1222",
      "--card": "#101827",
      "--border": "#1c2940",
      "--section": "#0d1321",
      "--section-alt": "#090e1b",
      "--chrome": "#020617",
      "--footer": "#03060d",
      "--sponsor-bg": "#000000",
      "--hero-overlay-end": "#090e1b",
      "--hero-panel": "#191f31",
      "--surface-raised": "#131929",
      "--team-card": "#111827",
      "--feed-card": "#151c2d",
      "--feed-media": "#0e1628",
      "--icon-blue": "#12326a",
      "--sponsor-pill": "#07101f",
    },
  },
  {
    id: "subtle",
    name: "Subtelnie jaśniej",
    label: "A",
    note: "Najbliżej obecnej stylistyki",
    values: {
      "--background": "#07101d",
      "--muted": "#0e1728",
      "--card": "#111a2b",
      "--border": "#22324d",
      "--section": "#10182a",
      "--section-alt": "#0d1728",
      "--chrome": "#05101e",
      "--footer": "#07101a",
      "--sponsor-bg": "#050913",
      "--hero-overlay-end": "#0b1324",
      "--hero-panel": "#151d30",
      "--surface-raised": "#151d30",
      "--team-card": "#141d2f",
      "--feed-card": "#172033",
      "--feed-media": "#101a2d",
      "--icon-blue": "#173d79",
      "--sponsor-pill": "#0b1628",
    },
  },
  {
    id: "navy",
    name: "Czytelny navy",
    label: "B",
    note: "Lżejszy, nadal bardzo sportowy",
    values: {
      "--background": "#081426",
      "--muted": "#101b30",
      "--card": "#142035",
      "--border": "#263956",
      "--section": "#111c31",
      "--section-alt": "#0f1b30",
      "--chrome": "#061123",
      "--footer": "#071222",
      "--sponsor-bg": "#06101f",
      "--hero-overlay-end": "#0e192e",
      "--hero-panel": "#17233a",
      "--surface-raised": "#17233a",
      "--team-card": "#162238",
      "--feed-card": "#1a253a",
      "--feed-media": "#122038",
      "--icon-blue": "#1b4686",
      "--sponsor-pill": "#0e1a2f",
    },
  },
  {
    id: "blue",
    name: "Sportowy błękit",
    label: "C",
    note: "Trochę świeższy i bardziej niebieski",
    values: {
      "--background": "#0a1728",
      "--muted": "#122038",
      "--card": "#17243a",
      "--border": "#2a405f",
      "--section": "#132033",
      "--section-alt": "#111e33",
      "--chrome": "#071426",
      "--footer": "#091423",
      "--sponsor-bg": "#07111f",
      "--hero-overlay-end": "#101c31",
      "--hero-panel": "#18263e",
      "--surface-raised": "#18263e",
      "--team-card": "#18263e",
      "--feed-card": "#1b2940",
      "--feed-media": "#14243b",
      "--icon-blue": "#1c4f92",
      "--sponsor-pill": "#101e35",
    },
  },
  {
    id: "lightest",
    name: "Najjaśniejszy",
    label: "D",
    note: "Największa zmiana bez utraty klimatu",
    values: {
      "--background": "#0e1a2d",
      "--muted": "#17243a",
      "--card": "#1a2940",
      "--border": "#304766",
      "--section": "#17243a",
      "--section-alt": "#142238",
      "--chrome": "#0b1729",
      "--footer": "#0b1728",
      "--sponsor-bg": "#0b1422",
      "--hero-overlay-end": "#142238",
      "--hero-panel": "#1c2b44",
      "--surface-raised": "#1c2b44",
      "--team-card": "#1a2942",
      "--feed-card": "#20304a",
      "--feed-media": "#18283f",
      "--icon-blue": "#225aa0",
      "--sponsor-pill": "#14243a",
    },
  },
  {
    id: "deep-navy",
    name: "Głęboki navy",
    label: "E",
    note: "Ciemniej, ale wyraźnie bardziej niebiesko",
    values: {
      "--background": "#06152b",
      "--muted": "#0d1d36",
      "--card": "#10223e",
      "--border": "#244163",
      "--section": "#0d1d35",
      "--section-alt": "#0a1930",
      "--chrome": "#041026",
      "--footer": "#061222",
      "--sponsor-bg": "#040d1c",
      "--hero-overlay-end": "#0a1930",
      "--hero-panel": "#122440",
      "--surface-raised": "#132744",
      "--team-card": "#12243f",
      "--feed-card": "#152843",
      "--feed-media": "#0d203b",
      "--icon-blue": "#1956a3",
      "--sponsor-pill": "#0a1b33",
    },
  },
  {
    id: "club-blue",
    name: "Klubowy blue",
    label: "F",
    note: "Mocniejszy błękit na sekcjach i kartach",
    values: {
      "--background": "#09203a",
      "--muted": "#123154",
      "--card": "#163a62",
      "--border": "#2d5f91",
      "--section": "#102c4e",
      "--section-alt": "#0d2747",
      "--chrome": "#071a31",
      "--footer": "#081a2d",
      "--sponsor-bg": "#071528",
      "--hero-overlay-end": "#0d2747",
      "--hero-panel": "#17365b",
      "--surface-raised": "#17375e",
      "--team-card": "#15365c",
      "--feed-card": "#1a3d64",
      "--feed-media": "#123155",
      "--icon-blue": "#2572c6",
      "--sponsor-pill": "#0f2b4c",
    },
  },
  {
    id: "steel-blue",
    name: "Stalowy błękit",
    label: "G",
    note: "Chłodniejszy i bardziej elegancki",
    values: {
      "--background": "#0c1b2c",
      "--muted": "#14263a",
      "--card": "#1a2d43",
      "--border": "#34516d",
      "--section": "#15263b",
      "--section-alt": "#112238",
      "--chrome": "#081827",
      "--footer": "#0a1724",
      "--sponsor-bg": "#08131f",
      "--hero-overlay-end": "#112238",
      "--hero-panel": "#1a2d43",
      "--surface-raised": "#1b3048",
      "--team-card": "#192d44",
      "--feed-card": "#1f3349",
      "--feed-media": "#172a40",
      "--icon-blue": "#2b6ea8",
      "--sponsor-pill": "#11243a",
    },
  },
  {
    id: "midnight-navy",
    name: "Midnight navy",
    label: "H",
    note: "Ciemny premium z granatowym światłem",
    values: {
      "--background": "#030d1e",
      "--muted": "#091832",
      "--card": "#0d1f3c",
      "--border": "#203c64",
      "--section": "#091833",
      "--section-alt": "#06142b",
      "--chrome": "#020a18",
      "--footer": "#030c1b",
      "--sponsor-bg": "#010713",
      "--hero-overlay-end": "#06142b",
      "--hero-panel": "#102341",
      "--surface-raised": "#102443",
      "--team-card": "#0f213f",
      "--feed-card": "#122644",
      "--feed-media": "#0b1d38",
      "--icon-blue": "#165db4",
      "--sponsor-pill": "#071936",
    },
  },
  {
    id: "azure-blue",
    name: "Jaśniejszy błękit",
    label: "I",
    note: "Najbardziej czytelny z niebieskich",
    values: {
      "--background": "#10243b",
      "--muted": "#1a3552",
      "--card": "#203c5a",
      "--border": "#3b6388",
      "--section": "#1a3450",
      "--section-alt": "#162f4b",
      "--chrome": "#0d2036",
      "--footer": "#0e2034",
      "--sponsor-bg": "#0c1a2a",
      "--hero-overlay-end": "#162f4b",
      "--hero-panel": "#223f5f",
      "--surface-raised": "#223f5f",
      "--team-card": "#213d5d",
      "--feed-card": "#264664",
      "--feed-media": "#1b3755",
      "--icon-blue": "#2f83d5",
      "--sponsor-pill": "#18304d",
    },
  },
  {
    id: "bright-navy",
    name: "Jasny navy",
    label: "J",
    note: "Moja propozycja jaśniejszego designu",
    values: {
      "--background": "#132b45",
      "--muted": "#1f3c5a",
      "--card": "#25486a",
      "--border": "#54799d",
      "--section": "#1d3957",
      "--section-alt": "#193450",
      "--chrome": "#0c1d32",
      "--footer": "#10243a",
      "--sponsor-bg": "#0d1d30",
      "--hero-overlay-end": "#193450",
      "--hero-panel": "#294d70",
      "--surface-raised": "#294d70",
      "--team-card": "#24496d",
      "--feed-card": "#2a4f72",
      "--feed-media": "#1e4164",
      "--icon-blue": "#3c91e6",
      "--sponsor-pill": "#1a3654",
    },
  },
  {
    id: "day-blue",
    name: "Dzienny błękit",
    label: "K",
    note: "Najbardziej rozświetlony, nadal kontrastowy",
    values: {
      "--background": "#183856",
      "--muted": "#274a68",
      "--card": "#2f5574",
      "--border": "#6389aa",
      "--section": "#254967",
      "--section-alt": "#214360",
      "--chrome": "#10283f",
      "--footer": "#142c43",
      "--sponsor-bg": "#102439",
      "--hero-overlay-end": "#214360",
      "--hero-panel": "#345b7c",
      "--surface-raised": "#345b7c",
      "--team-card": "#315878",
      "--feed-card": "#365f7f",
      "--feed-media": "#294f70",
      "--icon-blue": "#55a4f0",
      "--sponsor-pill": "#244767",
    },
  },
  {
    id: "soft-blue",
    name: "Miękki klubowy",
    label: "L",
    note: "Jaśniej, spokojniej i mniej kontrastowo",
    values: {
      "--background": "#183149",
      "--muted": "#263f59",
      "--card": "#2e4964",
      "--border": "#5f7892",
      "--section": "#263f5a",
      "--section-alt": "#213a55",
      "--chrome": "#102236",
      "--footer": "#13283d",
      "--sponsor-bg": "#102033",
      "--hero-overlay-end": "#213a55",
      "--hero-panel": "#334f69",
      "--surface-raised": "#334f69",
      "--team-card": "#304d68",
      "--feed-card": "#36536e",
      "--feed-media": "#294760",
      "--icon-blue": "#6aa7df",
      "--sponsor-pill": "#243f5a",
    },
  },
];

function getCssSnippet(variant: PreviewVariant) {
  return [
    `--background: ${variant.values["--background"]};`,
    `--muted: ${variant.values["--muted"]};`,
    `--card: ${variant.values["--card"]};`,
    `--border: ${variant.values["--border"]};`,
    `--section: ${variant.values["--section"]};`,
    `--section-alt: ${variant.values["--section-alt"]};`,
  ].join("\n");
}

export function BackgroundPreviewShell({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState("bright-navy");
  const [copied, setCopied] = useState(false);
  const originalValues = useRef<Partial<Record<PreviewVariable, string>> | null>(null);
  const activeVariant = previewVariants.find((variant) => variant.id === activeId) ?? previewVariants[1];
  const cssSnippet = useMemo(() => getCssSnippet(activeVariant), [activeVariant]);

  useEffect(() => {
    const root = document.documentElement;

    originalValues.current = previewVariables.reduce<Partial<Record<PreviewVariable, string>>>(
      (values, variable) => {
        values[variable] = root.style.getPropertyValue(variable);
        return values;
      },
      {},
    );

    return () => {
      if (!originalValues.current) return;

      previewVariables.forEach((variable) => {
        const value = originalValues.current?.[variable];

        if (value) {
          root.style.setProperty(variable, value);
        } else {
          root.style.removeProperty(variable);
        }
      });
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    previewVariables.forEach((variable) => {
      root.style.setProperty(variable, activeVariant.values[variable]);
    });
  }, [activeVariant]);

  useEffect(() => {
    if (!copied) return;

    const timeout = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function copyCss() {
    await navigator.clipboard.writeText(cssSnippet);
    setCopied(true);
  }

  return (
    <>
      <aside className="fixed inset-x-3 bottom-3 z-50 max-h-[72vh] overflow-auto rounded-lg border border-white/10 bg-[#07101f]/95 p-4 text-white shadow-2xl shadow-black/35 backdrop-blur-xl sm:inset-x-auto sm:right-5 sm:top-24 sm:bottom-auto sm:max-h-[calc(100vh-7rem)] sm:w-[380px]">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
            <Palette size={20} />
          </span>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.12em] text-primary">
              Podgląd designu
            </p>
            <p className="text-xs font-bold text-slate-400">
              Warianty 0 oraz A-L
            </p>
          </div>
        </div>

        <div className="grid gap-2">
          {previewVariants.map((variant) => {
            const isActive = variant.id === activeVariant.id;

            return (
              <button
                key={variant.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveId(variant.id)}
                className={`flex items-center gap-3 rounded-md border p-3 text-left transition ${
                  isActive
                    ? "border-primary bg-primary/10"
                    : "border-white/10 bg-white/5 hover:border-primary/70"
                }`}
              >
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-white/15 text-sm font-black"
                  style={
                    {
                      backgroundColor: variant.values["--background"],
                      color: variant.id === "original" ? "#94a3b8" : "#f3f7ff",
                    } as CSSProperties
                  }
                >
                  {variant.label}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black">{variant.name}</span>
                  <span className="block text-xs font-bold text-slate-400">
                    {variant.note}
                  </span>
                </span>
                {isActive ? <Check className="shrink-0 text-primary" size={18} /> : null}
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-md border border-white/10 bg-black/25 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
              {activeVariant.name}
            </p>
            <button
              type="button"
              onClick={copyCss}
              className="inline-flex h-8 items-center gap-2 rounded-md bg-white/10 px-3 text-xs font-black text-white transition hover:bg-white/15"
            >
              {copied ? <Check size={14} /> : <Clipboard size={14} />}
              {copied ? "Skopiowane" : "Kopiuj"}
            </button>
          </div>
          <pre className="whitespace-pre-wrap font-mono text-[11px] leading-5 text-slate-300">
            {cssSnippet}
          </pre>
        </div>
      </aside>
      {children}
    </>
  );
}
