"use client";

import { useQuery } from "convex/react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  Database,
  FileText,
  Newspaper,
  Trophy,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { api } from "../../../../convex/_generated/api";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { adminTableConfigs, type AdminTableName } from "@/lib/adminTables";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const matchDateFormatter = new Intl.DateTimeFormat("pl-PL", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const activityIcons = {
  acceptance: BookOpenCheck,
  article: Newspaper,
  facebook: Activity,
  gallery: FileText,
  match: Trophy,
} as const;

const DASHBOARD_WINDOW_MS = 30 * 60_000;

function currentDashboardWindow() {
  return Math.floor(Date.now() / DASHBOARD_WINDOW_MS) * DASHBOARD_WINDOW_MS;
}

export default function AdminDashboardPage() {
  const [now, setNow] = useState(currentDashboardWindow);
  const overview = useQuery(api.adminDashboard.overview, { now });

  useEffect(() => {
    const refreshTimeWindow = () => setNow(currentDashboardWindow());
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refreshTimeWindow();
    };
    window.addEventListener("focus", refreshTimeWindow);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refreshTimeWindow);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  if (overview === undefined) {
    return <DashboardSkeleton />;
  }

  const anyCapped = (tables: AdminTableName[]) =>
    tables.some((table) => overview.cappedTables.includes(table));
  const tableCount = (table: AdminTableName) =>
    `${overview.counts[table]}${overview.cappedTables.includes(table) ? "+" : ""}`;

  const primaryMetrics = [
    {
      label: "Treści i media",
      value: overview.metrics.content,
      detail: `${tableCount("articles")} artykułów, ${tableCount("fbPosts")} postów FB`,
      href: "/admin/articles",
      icon: Newspaper,
      capped: anyCapped([
        "articles",
        "fbPosts",
        "galleries",
        "documents",
        "pages",
      ]),
    },
    {
      label: "Aktywne drużyny",
      value: overview.metrics.activeTeams,
      detail: `${overview.metrics.coaches}${overview.cappedTables.includes("people") ? "+" : ""} trenerów, ${tableCount("players")} zawodników`,
      href: "/admin/druzyny",
      icon: UsersRound,
      capped: overview.cappedTables.includes("teams"),
    },
    {
      label: "Nadchodzące mecze",
      value: overview.metrics.upcomingMatches,
      detail: overview.metrics.liveMatches
        ? `${overview.metrics.liveMatches} obecnie na żywo`
        : "Brak aktywnego meczu live",
      href: "/admin/mecze",
      icon: CalendarClock,
      capped: overview.metrics.upcomingMatchesCapped,
    },
    {
      label: "Akceptacje",
      value: overview.metrics.acceptances,
      detail: "Zapisane zgody regulaminowe",
      href: "/admin/regulamin",
      icon: BookOpenCheck,
      capped: overview.cappedTables.includes("regulationAcceptances"),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        eyebrow="Centrum operacyjne"
        title="Dzień dobry"
        description="Najważniejsze dane klubu, zadania wymagające uwagi i ostatnie zmiany w jednym widoku."
        actions={
          <Button asChild variant="secondary">
            <Link href="/admin/dane">
              <Database aria-hidden="true" size={17} />
              Wszystkie dane
            </Link>
          </Button>
        }
      />

      <section aria-labelledby="dashboard-metrics" className="mt-6">
        <h2 id="dashboard-metrics" className="sr-only">
          Najważniejsze wskaźniki
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {primaryMetrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Link
                key={metric.label}
                href={metric.href}
                className="group rounded-xl border border-border bg-card p-4 transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-[#b6c2cf] hover:shadow-[0_10px_28px_rgba(16,42,67,0.08)] active:translate-y-0"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground">{metric.label}</p>
                    <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-navy">
                      {metric.value}{metric.capped ? "+" : ""}
                    </p>
                  </div>
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#edf3f8] text-[#234f78]">
                    <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">{metric.detail}</p>
                  <ArrowRight
                    aria-hidden="true"
                    size={15}
                    className="shrink-0 text-[#8090a2] transition-transform group-hover:translate-x-0.5"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(330px,0.9fr)]">
        <section className="rounded-xl border border-border bg-card" aria-labelledby="attention-heading">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 id="attention-heading" className="text-base font-black text-navy">
                Wymaga uwagi
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Operacyjne sprawy do sprawdzenia</p>
            </div>
            <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs font-bold tabular-nums text-[#526275]">
              {overview.attention.length}
            </span>
          </div>
          {overview.attention.length > 0 ? (
            <div className="divide-y divide-border">
              {overview.attention.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="group flex items-start gap-3 px-5 py-4 transition-colors hover:bg-[#f8fafc]"
                >
                  <span
                    className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                      item.tone === "warning"
                        ? "bg-[#fff4e5] text-[#9a5a00]"
                        : "bg-[#edf3f8] text-[#234f78]"
                    }`}
                  >
                    {item.tone === "warning" ? (
                      <AlertTriangle aria-hidden="true" size={16} />
                    ) : (
                      <Activity aria-hidden="true" size={16} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-navy">{item.title}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {item.detail}
                    </span>
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    size={15}
                    className="mt-2 shrink-0 text-[#8997a7] transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 px-5 py-7">
              <CheckCircle2 aria-hidden="true" className="text-[#668000]" size={22} />
              <div>
                <p className="text-sm font-bold text-navy">Wszystko jest pod kontrolą</p>
                <p className="mt-1 text-xs text-muted-foreground">Brak nowych alertów operacyjnych.</p>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card" aria-labelledby="matches-heading">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 id="matches-heading" className="text-base font-black text-navy">Najbliższe mecze</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Terminarz na kolejne dni</p>
            </div>
            <Link href="/admin/mecze" className="text-xs font-bold text-[#234f78] hover:underline">
              Pełny terminarz
            </Link>
          </div>
          {overview.upcoming.length ? (
            <div className="divide-y divide-border">
              {overview.upcoming.slice(0, 4).map((match) => (
                <Link
                  key={match.id}
                  href="/admin/mecze"
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[#f8fafc]"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#edf3f8] text-[#234f78]">
                    <Trophy aria-hidden="true" size={18} strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-navy">
                      {match.homeTeam} <span className="font-normal text-muted-foreground">vs</span> {match.awayTeam}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {match.dateConfirmed
                        ? matchDateFormatter.format(match.date)
                        : match.roundLabel ?? "Termin orientacyjny"}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-5 py-7 text-sm text-muted-foreground">Brak nadchodzących meczów.</div>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <section className="rounded-xl border border-border bg-card" aria-labelledby="activity-heading">
          <div className="border-b border-border px-5 py-4">
            <h2 id="activity-heading" className="text-base font-black text-navy">Ostatnia aktywność</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Najnowsze rekordy z kluczowych obszarów</p>
          </div>
          {overview.recent.length ? (
            <div className="divide-y divide-border">
              {overview.recent.map((item) => {
                const Icon = activityIcons[item.kind];
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="group grid grid-cols-[32px_minmax(0,1fr)] gap-x-3 px-5 py-3.5 transition-colors hover:bg-[#f8fafc] sm:grid-cols-[32px_minmax(0,1fr)_auto]"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-[#52687d]">
                      <Icon aria-hidden="true" size={15} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-navy">{item.title}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{item.detail}</span>
                    </span>
                    <time className="col-start-2 mt-1 text-[11px] tabular-nums text-muted-foreground sm:col-start-3 sm:row-start-1 sm:mt-1">
                      {dateFormatter.format(item.at)}
                    </time>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-7 text-sm text-muted-foreground">Brak ostatniej aktywności.</div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card" aria-labelledby="data-heading">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 id="data-heading" className="text-base font-black text-navy">Pokrycie danych Convex</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">17 tabel i magazyn plików są dostępne w panelu</p>
            </div>
            <span className="rounded-md bg-[#eef5cf] px-2 py-1 font-mono text-xs font-bold text-[#506500]">
              {adminTableConfigs.length} / {adminTableConfigs.length}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
            {adminTableConfigs.map((table) => {
              const capped = overview.cappedTables.includes(table.key);
              return (
                <Link
                  key={table.key}
                  href={`/admin/dane?table=${table.key}`}
                  className="bg-white px-3 py-3 transition-colors hover:bg-[#f8fafc]"
                >
                  <span className="block truncate text-[11px] font-semibold text-muted-foreground">
                    {table.label}
                  </span>
                  <span className="mt-1 block font-mono text-base font-bold tabular-nums text-navy">
                    {overview.counts[table.key]}{capped ? "+" : ""}
                  </span>
                </Link>
              );
            })}
          </div>
          <Link
            href="/admin/dane"
            className="flex items-center justify-center gap-2 border-t border-border px-5 py-3.5 text-xs font-bold text-[#234f78] transition-colors hover:bg-[#f8fafc]"
          >
            Otwórz Centrum danych
            <ArrowRight aria-hidden="true" size={14} />
          </Link>
        </section>
      </div>

      <p className="mt-5 text-right text-[11px] text-muted-foreground">
        Punkt odniesienia terminarza: {dateFormatter.format(overview.generatedAt)}
      </p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="animate-pulse">
      <span className="sr-only">Ładowanie pulpitu</span>
      <div aria-hidden="true" className="border-b border-border pb-6">
        <div className="h-3 w-28 rounded bg-[#dfe5eb]" />
        <div className="mt-4 h-9 w-52 rounded-lg bg-[#dfe5eb]" />
        <div className="mt-3 h-4 w-[520px] max-w-full rounded bg-[#e5eaf0]" />
      </div>
      <div aria-hidden="true" className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-32 rounded-xl border border-border bg-white" />
        ))}
      </div>
      <div aria-hidden="true" className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="h-80 rounded-xl border border-border bg-white" />
        <div className="h-80 rounded-xl border border-border bg-white" />
      </div>
    </div>
  );
}
