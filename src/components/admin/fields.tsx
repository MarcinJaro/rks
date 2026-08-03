"use client";

import { ReactNode } from "react";

export const inputClass =
  "rounded-md border border-border bg-background px-3 py-2 font-normal";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm font-bold">
      {label}
      {children}
    </label>
  );
}

export function Feedback({
  error,
  message,
}: {
  error?: string | null;
  message?: string | null;
}) {
  if (error) {
    return (
      <p className="mt-3 rounded-md bg-red-500/15 px-4 py-2 text-sm font-bold text-red-300">
        {error}
      </p>
    );
  }
  if (message) {
    return (
      <p className="mt-3 rounded-md bg-primary/15 px-4 py-2 text-sm font-bold text-primary">
        {message}
      </p>
    );
  }
  return null;
}
