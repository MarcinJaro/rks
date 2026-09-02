"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Download, LockKeyhole, Trash2 } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Feedback, inputClass } from "@/components/admin/fields";
import { errorMessage } from "@/lib/convexError";

function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function consentSummary(item: {
  acceptedRegulation: boolean;
  acceptedChildProtection: boolean;
  acceptedDataProcessing: boolean;
}) {
  return [
    item.acceptedRegulation ? "regulamin" : null,
    item.acceptedChildProtection ? "ochrona dzieci" : null,
    item.acceptedDataProcessing ? "RODO" : null,
  ]
    .filter(Boolean)
    .join(" + ");
}

/** RFC 4180: cudzysłowy podwajamy, całość opakowujemy w cudzysłów. */
function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function SensitiveValue({ value, label }: { value?: string; label: string }) {
  if (!value) return <span className="text-muted-foreground">Brak</span>;

  return (
    <details className="group inline-block">
      <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-md bg-[#fff4e5] px-2 py-1 text-xs font-bold text-[#7a4900] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary">
        <LockKeyhole aria-hidden="true" size={12} />
        Pokaż {label}
      </summary>
      <span className="mt-1 block font-mono text-xs text-navy">{value}</span>
    </details>
  );
}

export default function AdminRegulationPage() {
  const acceptances = useQuery(api.regulations.adminList);
  const removeAcceptance = useMutation(api.regulations.removeAcceptance);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!acceptances) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return acceptances;
    return acceptances.filter((item) =>
      [item.childName, item.parentName, item.parentEmail, item.childYearGroup]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [acceptances, query]);

  function handleExport() {
    if (!filtered.length) return;
    const header = [
      "Dziecko",
      "Rocznik",
      "PESEL dziecka",
      "Rodzic",
      "PESEL rodzica",
      "E-mail",
      "Telefon",
      "Wersja regulaminu",
      "Zgody",
      "Data akceptacji",
    ];
    const rows = filtered.map((item) =>
      [
        item.childName,
        item.childYearGroup,
        item.childPesel ?? "",
        item.parentName,
        item.parentPesel ?? "",
        item.parentEmail,
        item.parentPhone ?? "",
        item.documentVersion,
        consentSummary(item),
        formatDateTime(item.acceptedAt),
      ]
        .map(csvCell)
        .join(","),
    );
    // BOM, żeby Excel poprawnie odczytał polskie znaki.
    const csv = `﻿${[header.map(csvCell).join(","), ...rows].join("\r\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "akceptacje-regulaminu.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleRemove(
    id: Id<"regulationAcceptances">,
    childName: string,
  ) {
    setError(null);
    if (
      !window.confirm(
        `Usunąć zgodę dla zawodnika ${childName}? To dowód prawny akceptacji regulaminu i zgód RODO - operacji nie da się cofnąć.`,
      )
    ) {
      return;
    }
    try {
      await removeAcceptance({ id });
    } catch (err) {
      setError(errorMessage(err, "Nie udało się usunąć"));
    }
  }

  if (acceptances === undefined) {
    return <p className="text-sm text-muted-foreground">Wczytywanie…</p>;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-navy">
            Akceptacje regulaminu
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {acceptances.length} zgód złożonych przez rodziców.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <label className="min-w-0 sm:w-72">
            <span className="sr-only">Szukaj dziecka lub rodzica</span>
            <input
              className={inputClass}
              placeholder="Szukaj dziecka lub rodzica"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <Button onClick={handleExport} disabled={!filtered.length}>
            <Download aria-hidden="true" size={18} />
            Eksport CSV
          </Button>
        </div>
      </div>

      <Feedback error={error} />

      {filtered.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
          Brak zgód do wyświetlenia.
        </p>
      ) : (
        <div
          role="region"
          aria-label="Akceptacje regulaminu. Tabelę można przewijać poziomo."
          tabIndex={0}
          className="overflow-x-auto rounded-lg border border-border bg-card outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary"
        >
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted text-xs font-black uppercase text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3">Dziecko</th>
                <th scope="col" className="px-4 py-3">Rocznik</th>
                <th scope="col" className="px-4 py-3">PESEL</th>
                <th scope="col" className="px-4 py-3">Rodzic</th>
                <th scope="col" className="px-4 py-3">Kontakt</th>
                <th scope="col" className="px-4 py-3">Wersja</th>
                <th scope="col" className="px-4 py-3">Data</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Akcje</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item._id} className="border-t border-border">
                  <th scope="row" className="px-4 py-3 text-left font-bold text-navy">
                    {item.childName}
                  </th>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.childYearGroup}
                  </td>
                  <td className="px-4 py-3">
                    <SensitiveValue value={item.childPesel} label="PESEL dziecka" />
                  </td>
                  <td className="px-4 py-3 text-navy">
                    <span className="mb-1 block font-semibold">{item.parentName}</span>
                    <SensitiveValue value={item.parentPesel} label="PESEL opiekuna" />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="block">{item.parentEmail}</span>
                    {item.parentPhone ? (
                      <span className="block">{item.parentPhone}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.documentVersion}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDateTime(item.acceptedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Usuń zgodę dla ${item.childName}`}
                      onClick={() => handleRemove(item._id, item.childName)}
                    >
                      <Trash2 aria-hidden="true" size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
