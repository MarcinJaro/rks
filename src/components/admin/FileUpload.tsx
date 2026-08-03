"use client";

import { ChangeEvent, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export function FileUpload({
  label,
  accept,
  maxSizeMb = 10,
  multiple = false,
  onUploaded,
}: {
  label: string;
  accept: string;
  maxSizeMb?: number;
  multiple?: boolean;
  onUploaded: (ids: Id<"_storage">[]) => void;
}) {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setError(null);
    const tooBig = files.find((file) => file.size > maxSizeMb * 1024 * 1024);
    if (tooBig) {
      setError(`Plik ${tooBig.name} przekracza ${maxSizeMb} MB`);
      return;
    }
    setBusy(true);
    try {
      const ids: Id<"_storage">[] = [];
      for (const file of files) {
        const url = await generateUploadUrl();
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!response.ok) throw new Error(`Nie udało się wysłać ${file.name}`);
        const { storageId } = (await response.json()) as {
          storageId: Id<"_storage">;
        };
        ids.push(storageId);
      }
      onUploaded(ids);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd wysyłania pliku");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-1 text-sm font-bold">
      {label}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        disabled={busy}
        className="text-sm font-normal file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-bold file:text-secondary-foreground"
      />
      {busy ? (
        <p className="text-xs font-normal text-muted-foreground">Wysyłanie…</p>
      ) : null}
      {error ? <p className="text-xs font-bold text-red-300">{error}</p> : null}
    </div>
  );
}
