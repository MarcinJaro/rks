"use client";

import { usePaginatedQuery } from "convex/react";
import {
  ArrowUpRight,
  ChevronDown,
  Database,
  Eye,
  FileSearch,
  LockKeyhole,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useState } from "react";

import { api } from "../../../convex/_generated/api";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import {
  adminFieldLabels,
  adminTableConfigByName,
  adminTableConfigs,
  isAdminTableName,
  type AdminTableName,
} from "@/lib/adminTables";

const dateFields = new Set([
  "_creationTime",
  "acceptedAt",
  "date",
  "endedAt",
  "fbUpdatedAt",
  "lastSyncedAt",
  "publishedAt",
  "startsAt",
  "syncedAt",
]);

const sensitiveFields = new Set(["childPesel", "parentPesel"]);

const dateFormatter = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const valueLabels: Record<string, string> = {
  album: "Album",
  assist: "Asysta",
  draft: "Szkic",
  ended: "Zakończona",
  event: "Wydarzenie",
  finished: "Zakończony",
  goal: "Bramka",
  home: "Gospodarze",
  link: "Link",
  live: "Na żywo",
  manual: "Ręczne",
  partner: "Partner",
  photo: "Zdjęcie",
  published: "Opublikowany",
  redCard: "Czerwona kartka",
  scheduled: "Zaplanowana",
  sponsor: "Sponsor",
  text: "Tekst",
  upcoming: "Nadchodzący",
  away: "Goście",
  video: "Wideo",
  yellowCard: "Żółta kartka",
};

function polishNoun(
  value: number,
  singular: string,
  paucal: string,
  plural: string,
) {
  if (value === 1) return singular;
  const lastTwo = value % 100;
  const last = value % 10;
  return last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)
    ? paucal
    : plural;
}

export function AdminDataExplorer({ initialTable }: { initialTable: AdminTableName }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tableParam = searchParams.get("table") ?? undefined;
  const table = isAdminTableName(tableParam) ? tableParam : initialTable;
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const config = adminTableConfigByName[table];
  const { results, status, loadMore } = usePaginatedQuery(
    api.adminData.listTable,
    { table },
    { initialNumItems: 25 },
  );

  const rows = results as Record<string, unknown>[];

  function changeTable(nextTable: AdminTableName) {
    setExpandedRow(null);
    router.replace(`/admin/dane?table=${nextTable}`, { scroll: false });
  }

  return (
    <div>
      <AdminPageHeader
        eyebrow="Convex"
        title="Centrum danych"
        description="Kompletny, chronologiczny podgląd 17 tabel aplikacji i Convex Storage. Edycja pozostaje w dedykowanych modułach biznesowych."
        actions={
          config.editorHref ? (
            <Button asChild variant="secondary">
              <Link href={config.editorHref}>
                Otwórz moduł
                <ArrowUpRight aria-hidden="true" size={16} />
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="self-start rounded-xl border border-border bg-card p-3 lg:sticky lg:top-[100px]">
          <div className="px-2 pb-3 pt-1 lg:hidden">
            <label htmlFor="data-table" className="text-xs font-bold text-[#526275]">
              Wybierz zbiór danych
            </label>
            <div className="relative mt-2">
              <select
                id="data-table"
                value={table}
                onChange={(event) => changeTable(event.target.value as AdminTableName)}
                className="min-h-11 w-full appearance-none rounded-lg border border-[#7b8b9c] bg-background py-2 pl-3 pr-9 text-sm font-bold text-navy outline-none transition-[border-color,box-shadow] focus:border-secondary focus:ring-3 focus:ring-secondary/15"
              >
                {["Treści", "Sport", "Klub", "System"].map((group) => (
                  <optgroup key={group} label={group}>
                    {adminTableConfigs
                      .filter((item) => item.group === group)
                      .map((item) => (
                        <option key={item.key} value={item.key}>
                          {item.label}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#718096]"
              />
            </div>
          </div>

          <div className="hidden max-h-[calc(100dvh-230px)] overflow-y-auto border-t border-border pt-2 lg:block">
            {["Treści", "Sport", "Klub", "System"].map((group) => (
              <div key={group} className="mt-3 first:mt-1">
                <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {group}
                </p>
                <div className="grid gap-0.5">
                  {adminTableConfigs
                    .filter((item) => item.group === group)
                    .map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => changeTable(item.key)}
                        aria-current={table === item.key ? "page" : undefined}
                        className={`flex min-h-9 w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
                          table === item.key
                            ? "bg-[#eaf0f6] text-[#183f63]"
                            : "text-[#5f6e80] hover:bg-[#f4f6f8] hover:text-navy"
                        }`}
                      >
                        <span className="truncate">{item.label}</span>
                        {table === item.key ? <ChevronDown aria-hidden="true" size={13} className="-rotate-90" /> : null}
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="min-w-0 rounded-xl border border-border bg-card" aria-labelledby="dataset-title">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#edf3f8] text-[#234f78]">
                <Database aria-hidden="true" size={19} />
              </span>
              <div className="min-w-0">
                <h2 id="dataset-title" className="text-base font-black text-navy">{config.label}</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{config.description}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-md bg-muted px-2 py-1 font-mono text-[11px] font-semibold text-[#536275]">
                {table}
              </span>
              <span aria-live="polite" className="rounded-md bg-[#eef5cf] px-2 py-1 font-mono text-[11px] font-bold text-[#506500]">
                {rows.length}{status === "CanLoadMore" || status === "LoadingMore" ? "+" : ""}
              </span>
            </div>
          </div>

          {status === "LoadingFirstPage" ? (
            <DataTableSkeleton columns={config.columns.length} />
          ) : rows.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-muted text-[#718096]">
                <FileSearch aria-hidden="true" size={22} />
              </span>
              <h3 className="mt-4 text-base font-black text-navy">Brak rekordów</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                Ten zbiór danych jest obecnie pusty.
              </p>
              {config.editorHref ? (
                <Button asChild variant="outline" className="mt-5">
                  <Link href={config.editorHref}>Przejdź do modułu</Link>
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              <div
                role="region"
                aria-labelledby="dataset-title"
                aria-describedby="dataset-scroll-hint"
                tabIndex={0}
                className="overflow-x-auto outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary"
              >
                <p id="dataset-scroll-hint" className="sr-only">
                  Tabelę można przewijać poziomo. Ostatnia kolumna otwiera wszystkie pola rekordu.
                </p>
                <table className="w-full min-w-[820px] border-collapse text-left">
                  <caption className="sr-only">
                    Rekordy zbioru {config.label}. Wyświetlono {rows.length}{" "}
                    {polishNoun(rows.length, "pozycję", "pozycje", "pozycji")}.
                  </caption>
                  <thead className="bg-[#f7f9fb]">
                    <tr>
                      {config.columns.map((field) => (
                        <th
                          key={field}
                          scope="col"
                          className="border-b border-border px-4 py-3 text-[10px] font-bold uppercase tracking-[0.09em] text-[#5f6e80] first:pl-5 last:pr-5"
                        >
                          {adminFieldLabels[field] ?? field}
                        </th>
                      ))}
                      <th scope="col" className="w-12 border-b border-border px-3 py-3">
                        <span className="sr-only">Szczegóły</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((row, index) => {
                      const rowId = String(row._id ?? index);
                      const detailsId = `record-details-${rowId}`;
                      const isExpanded = expandedRow === rowId;
                      const relations = getAdminRelations(row);

                      return (
                        <Fragment key={rowId}>
                          <tr className="align-top transition-colors hover:bg-[#fafbfd]">
                            {config.columns.map((field, fieldIndex) => {
                              const Cell = fieldIndex === 0 ? "th" : "td";
                              return (
                                <Cell
                                  key={field}
                                  {...(fieldIndex === 0 ? { scope: "row" as const } : {})}
                                  className={`max-w-[360px] px-4 py-3.5 text-sm text-[#35485c] first:pl-5 last:pr-5 ${fieldIndex === 0 ? "font-semibold" : ""}`}
                                >
                                  <DataValue
                                    field={field}
                                    value={row[field]}
                                    relationLabel={relations[field]}
                                  />
                                </Cell>
                              );
                            })}
                            <td className="px-3 py-2.5 text-right">
                              <button
                                type="button"
                                aria-label={`${isExpanded ? "Ukryj" : "Pokaż"} wszystkie pola rekordu ${index + 1}`}
                                aria-expanded={isExpanded}
                                aria-controls={detailsId}
                                onClick={() => setExpandedRow(isExpanded ? null : rowId)}
                                className="ml-auto grid h-10 w-10 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                              >
                                <Eye aria-hidden="true" size={17} />
                              </button>
                            </td>
                          </tr>
                          {isExpanded ? (
                            <tr id={detailsId}>
                              <td colSpan={config.columns.length + 1} className="bg-[#102a43] px-5 py-4 text-slate-100">
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-xs font-bold text-white">Wszystkie pola rekordu</p>
                                  <span className="break-all font-mono text-[10px] text-slate-400">{rowId}</span>
                                </div>
                                <pre
                                  role="region"
                                  aria-label={`Surowe pola rekordu ${index + 1}`}
                                  tabIndex={0}
                                  className="max-h-80 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-5 text-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d8ff3e]"
                                >
                                  {safeStringify(row)}
                                </pre>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-border bg-[#fafbfd] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="text-xs text-muted-foreground">
                  Załadowano <span className="font-mono font-bold tabular-nums text-navy">{rows.length}</span>{" "}
                  {polishNoun(rows.length, "rekord", "rekordy", "rekordów")}
                </p>
                {status === "CanLoadMore" || status === "LoadingMore" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => loadMore(25)}
                    disabled={status === "LoadingMore"}
                  >
                    {status === "LoadingMore" ? "Wczytywanie..." : "Wczytaj kolejne 25"}
                  </Button>
                ) : (
                  <p className="text-xs font-semibold text-[#627286]">To wszystkie rekordy</p>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function DataValue({
  field,
  value,
  relationLabel,
}: {
  field: string;
  value: unknown;
  relationLabel?: string;
}) {
  if (value === undefined || value === null || value === "") {
    return <span className="text-muted-foreground">Brak</span>;
  }

  if (sensitiveFields.has(field)) {
    return (
      <details className="group inline-block">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md bg-[#fff4e5] px-2 py-1 text-xs font-bold text-[#8a5200]">
          <LockKeyhole aria-hidden="true" size={12} />
          Pokaż dane
        </summary>
        <span className="mt-1 block font-mono text-xs">{String(value)}</span>
      </details>
    );
  }

  if (typeof value === "boolean") {
    return (
      <span className={`inline-flex rounded-md px-2 py-1 text-xs font-bold ${value ? "bg-[#eef5cf] text-[#506500]" : "bg-muted text-[#627286]"}`}>
        {value ? "Tak" : "Nie"}
      </span>
    );
  }

  if (typeof value === "number" && dateFields.has(field)) {
    return <time className="whitespace-nowrap tabular-nums">{dateFormatter.format(value)}</time>;
  }

  if (typeof value === "number" && field === "size") {
    return <span className="font-mono tabular-nums">{formatBytes(value)}</span>;
  }

  if (typeof value === "number") {
    return <span className="font-mono tabular-nums">{value.toLocaleString("pl-PL")}</span>;
  }

  if (relationLabel && typeof value === "string") {
    return (
      <span className="block min-w-[150px]">
        <span className="block font-semibold text-navy">{relationLabel}</span>
        <code className="mt-1 block max-w-[210px] truncate font-mono text-[10px] text-muted-foreground" title={value}>
          {value}
        </code>
      </span>
    );
  }

  if (Array.isArray(value)) {
    const itemLabel =
      field === "rows"
        ? polishNoun(value.length, "pozycja", "pozycje", "pozycji")
        : field === "imageIds" || field === "galleryIds"
          ? polishNoun(value.length, "zdjęcie", "zdjęcia", "zdjęć")
          : polishNoun(value.length, "element", "elementy", "elementów");
    return (
      <span className="inline-flex rounded-md bg-muted px-2 py-1 text-xs font-bold text-[#536275]">
        {value.length} {itemLabel}
      </span>
    );
  }

  if (typeof value === "string" && /^https?:\/\//.test(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex max-w-[260px] items-center gap-1 truncate font-semibold text-[#234f78] hover:underline"
        title={value}
      >
        <span className="truncate">{value}</span>
        <ArrowUpRight aria-hidden="true" size={13} className="shrink-0" />
      </a>
    );
  }

  if (
    typeof value === "string" &&
    (field.endsWith("Id") || field === "_id" || field === "sha256")
  ) {
    return (
      <code className="block max-w-[210px] truncate rounded bg-muted px-1.5 py-1 font-mono text-[11px] text-[#526275]" title={value}>
        {value}
      </code>
    );
  }

  const text = String(value);
  const label = valueLabels[text] ?? text;
  const isStatus = ["status", "type", "postType", "kind", "role"].includes(field);

  if (isStatus) {
    return <span className="inline-flex rounded-md bg-[#edf3f8] px-2 py-1 text-xs font-bold text-[#234f78]">{label}</span>;
  }

  return (
    <span className="block max-w-[360px] whitespace-normal break-words leading-5" title={text.length > 120 ? text : undefined}>
      {text.length > 160 ? `${text.slice(0, 157)}...` : text}
    </span>
  );
}

function safeStringify(value: unknown) {
  return JSON.stringify(
    value,
    (key, nestedValue) => {
      if (key === "__adminRelations") return undefined;
      if (sensitiveFields.has(key)) return "[ukryte; użyj pola w tabeli]";
      return typeof nestedValue === "bigint"
        ? nestedValue.toString()
        : nestedValue;
    },
    2,
  );
}

function getAdminRelations(row: Record<string, unknown>) {
  const relations = row.__adminRelations;
  if (!relations || typeof relations !== "object" || Array.isArray(relations)) {
    return {} as Record<string, string>;
  }

  return Object.fromEntries(
    Object.entries(relations).filter((entry): entry is [string, string] =>
      typeof entry[1] === "string",
    ),
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DataTableSkeleton({ columns }: { columns: number }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="animate-pulse overflow-hidden">
      <span className="sr-only">Ładowanie rekordów</span>
      <div aria-hidden="true" className="grid h-11 gap-4 border-b border-border bg-[#f7f9fb] px-5" style={{ gridTemplateColumns: `repeat(${Math.max(columns, 1)}, minmax(100px, 1fr))` }}>
        {Array.from({ length: columns }).map((_, index) => (
          <span key={index} className="my-auto h-2.5 rounded bg-[#dfe5eb]" />
        ))}
      </div>
      {[0, 1, 2, 3, 4].map((row) => (
        <div aria-hidden="true" key={row} className="grid h-14 gap-4 border-b border-border px-5" style={{ gridTemplateColumns: `repeat(${Math.max(columns, 1)}, minmax(100px, 1fr))` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <span key={index} className="my-auto h-3 rounded bg-[#e8edf2]" />
          ))}
        </div>
      ))}
    </div>
  );
}
