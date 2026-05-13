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
  const [activeId, setActiveId] = useState("subtle");
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
      <aside className="fixed inset-x-3 bottom-3 z-50 max-h-[70vh] overflow-auto rounded-lg border border-white/10 bg-[#07101f]/95 p-4 text-white shadow-2xl shadow-black/35 backdrop-blur-xl sm:inset-x-auto sm:right-5 sm:top-24 sm:bottom-auto sm:w-[360px]">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
            <Palette size={20} />
          </span>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.12em] text-primary">
              Podgląd tła
            </p>
            <p className="text-xs font-bold text-slate-400">
              Kliknij wariant i przewiń stronę
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
