"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

function formatSyncedAt(timestamp: number) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function sourceLabel(sourceUrl?: string) {
  if (!sourceUrl) return "90minut.pl";
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    return "90minut.pl";
  }
}

function StandingsSkeleton() {
  return (
    <div className="mt-5 rounded-[24px] border border-white/8 bg-card p-6">
      <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
      <div className="mt-4 h-7 w-64 animate-pulse rounded bg-white/10" />
      <div className="mt-6 space-y-2">
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="h-9 animate-pulse rounded bg-white/8" />
        ))}
      </div>
    </div>
  );
}

const headCellClass = "px-3 py-2 text-center";
const cellClass = "px-3 py-3 text-center";

export function StandingsTable({ teamId }: { teamId: Id<"teams"> }) {
  const table = useQuery(api.standings.byTeam, { teamId });

  if (table === undefined) return <StandingsSkeleton />;
  if (!table || table.rows.length === 0) return null;

  const rows = [...table.rows].sort((a, b) => a.position - b.position);

  return (
    <section className="mt-5 rounded-[24px] border border-white/8 bg-card p-6">
      <p className="text-sm font-black uppercase text-primary">Tabela ligowa</p>
      <h3 className="mt-3 text-2xl font-black text-white">
        {table.competitionName}
      </h3>
      {table.season ? (
        <p className="mt-2 text-sm font-bold text-muted-foreground">
          Sezon {table.season}
        </p>
      ) : null}

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="text-xs font-black uppercase text-muted-foreground">
              <th scope="col" className={headCellClass}>
                #
              </th>
              <th scope="col" className="px-3 py-2 text-left">
                Drużyna
              </th>
              <th scope="col" className={headCellClass}>
                M
              </th>
              <th scope="col" className={headCellClass}>
                Pkt
              </th>
              <th scope="col" className={headCellClass}>
                Z
              </th>
              <th scope="col" className={headCellClass}>
                R
              </th>
              <th scope="col" className={headCellClass}>
                P
              </th>
              <th scope="col" className={headCellClass}>
                Bramki
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.map((row) => (
              <tr
                key={`${row.position}-${row.name}`}
                className={
                  row.isRks
                    ? "bg-primary/15 font-black text-white"
                    : "font-bold text-muted-foreground"
                }
              >
                <td className={cellClass}>{row.position}</td>
                <td className="px-3 py-3 text-left">{row.name}</td>
                <td className={cellClass}>{row.played}</td>
                <td
                  className={
                    row.isRks
                      ? `${cellClass} text-primary`
                      : `${cellClass} text-white`
                  }
                >
                  {row.points}
                </td>
                <td className={cellClass}>{row.wins}</td>
                <td className={cellClass}>{row.draws}</td>
                <td className={cellClass}>{row.losses}</td>
                <td className={cellClass}>
                  {row.goalsFor}-{row.goalsAgainst}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs font-bold text-muted-foreground">
        {table.sourceUrl ? (
          <a
            href={table.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white underline transition hover:text-primary"
          >
            Dane: {sourceLabel(table.sourceUrl)}
          </a>
        ) : (
          <span>Dane: {sourceLabel(table.sourceUrl)}</span>
        )}
        <span className="mx-2 text-white/30">|</span>
        Aktualizacja: {formatSyncedAt(table.syncedAt)}
      </p>
    </section>
  );
}
