"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Download, Trash2 } from "lucide-react";
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
          <h1 className="text-2xl font-black text-white">
            Akceptacje regulaminu
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {acceptances.length} zgód złożonych przez rodziców.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            className={inputClass}
            placeholder="Szukaj dziecka lub rodzica"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button onClick={handleExport} disabled={!filtered.length}>
            <Download size={18} />
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
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted text-xs font-black uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Dziecko</th>
                <th className="px-4 py-3">Rocznik</th>
                <th className="px-4 py-3">PESEL</th>
                <th className="px-4 py-3">Rodzic</th>
                <th className="px-4 py-3">Kontakt</th>
                <th className="px-4 py-3">Wersja</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item._id} className="border-t border-border">
                  <td className="px-4 py-3 font-bold text-white">
                    {item.childName}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.childYearGroup}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.childPesel ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="block">{item.parentName}</span>
                    {item.parentPesel ? (
                      <span className="block text-xs">{item.parentPesel}</span>
                    ) : null}
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
                      <Trash2 size={16} />
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
