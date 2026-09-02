"use client";

import { ReactNode } from "react";

export const inputClass =
  "min-h-11 w-full rounded-lg border border-[#7b8b9c] bg-background px-3 py-2 font-normal text-foreground shadow-[inset_0_1px_1px_rgba(16,42,67,0.03)] outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-muted-foreground focus:border-secondary focus:ring-3 focus:ring-secondary/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-bold text-foreground">
      <span>{label}</span>
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
      <p role="alert" className="mt-3 rounded-lg border border-[#f4c7c3] bg-[#fef3f2] px-4 py-2.5 text-sm font-bold text-[#b42318]">
        {error}
      </p>
    );
  }
  if (message) {
    return (
      <p role="status" aria-live="polite" className="mt-3 rounded-lg border border-[#c8d99d] bg-[#f5f9e8] px-4 py-2.5 text-sm font-bold text-[#496000]">
        {message}
      </p>
    );
  }
  return null;
}
