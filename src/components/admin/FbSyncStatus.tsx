"use client";

import type { ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function FbSyncStatus() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return (
      <StatusCard tone="muted">
        Brak konfiguracji Convex (NEXT_PUBLIC_CONVEX_URL). Synchronizacja
        z Facebookiem jest nieaktywna, strona pokazuje posty zastępcze.
      </StatusCard>
    );
  }
  return <LiveStatus />;
}

function LiveStatus() {
  const status = useQuery(api.facebook.sync.getSyncStatus, {});

  if (status === undefined) {
    return <StatusCard tone="muted">Ładowanie stanu synchronizacji…</StatusCard>;
  }
  if (status === null) {
    return (
      <StatusCard tone="muted">
        Synchronizacja z Facebookiem jeszcze się nie uruchomiła.
      </StatusCard>
    );
  }

  const when = new Date(status.at).toLocaleString("pl-PL");

  if (!status.ok) {
    return (
      <StatusCard tone="error">
        <strong>Błąd ostatniej synchronizacji</strong> ({when}): {status.error}
      </StatusCard>
    );
  }

  return (
    <StatusCard tone="ok">
      <strong>Ostatnia synchronizacja OK</strong> ({when}), nowe:{" "}
      {status.created}, zaktualizowane: {status.updated}, błędy postów:{" "}
      {status.errors}.
    </StatusCard>
  );
}

function StatusCard({
  tone,
  children,
}: {
  tone: "ok" | "error" | "muted";
  children: ReactNode;
}) {
  const toneClass =
    tone === "ok"
      ? "border-emerald-500/40 bg-emerald-500/10"
      : tone === "error"
        ? "border-red-500/40 bg-red-500/10"
        : "border-border bg-card";
  return (
    <div className={`rounded-lg border p-6 shadow-sm ${toneClass}`}>
      {children}
    </div>
  );
}
