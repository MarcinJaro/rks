"use client";

import { ImageCropDialog } from "@/components/admin/ImageCropDialog";
import { ChangeEvent, useEffect, useId, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export function FileUpload({
  label,
  accept,
  maxSizeMb = 10,
  multiple = false,
  cropAspect,
  recropUrl,
  onUploaded,
  onBusyChange,
}: {
  label: string;
  accept: string;
  maxSizeMb?: number;
  multiple?: boolean;
  /** Proporcje kadru (szer./wys.) - pojedyncze zdjęcie przechodzi przez kadrowanie. */
  cropAspect?: number;
  /** Aktualne zdjęcie, które można wykadrować ponownie bez szukania pliku. */
  recropUrl?: string | null;
  /** previewUrl jest ustawiony tylko dla zdjęć wykadrowanych w przeglądarce. */
  onUploaded: (ids: Id<"_storage">[], previewUrl?: string) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const inputId = useId();
  const statusId = `${inputId}-status`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropSource, setCropSource] = useState<string | null>(null);

  useEffect(() => {
    if (!cropSource) return;
    return () => URL.revokeObjectURL(cropSource);
  }, [cropSource]);

  async function uploadBlob(body: Blob, name: string) {
    const url = await generateUploadUrl();
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": body.type },
      body,
    });
    if (!response.ok) throw new Error(`Nie udało się wysłać ${name}`);
    const { storageId } = (await response.json()) as {
      storageId: Id<"_storage">;
    };
    return storageId;
  }

  async function handleCropped(blob: Blob) {
    setBusy(true);
    onBusyChange?.(true);
    try {
      const storageId = await uploadBlob(blob, "zdjęcia");
      setCropSource(null);
      onUploaded([storageId], URL.createObjectURL(blob));
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  async function handleRecrop() {
    if (!recropUrl) return;
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(recropUrl);
      if (!response.ok) throw new Error();
      setCropSource(URL.createObjectURL(await response.blob()));
    } catch {
      setError("Nie udało się wczytać aktualnego zdjęcia do kadrowania.");
    } finally {
      setBusy(false);
    }
  }

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setError(null);
    if (accept) {
      const acceptedTypes = accept.split(",").map((entry) => entry.trim());
      const invalid = files.find((file) => {
        return !acceptedTypes.some((entry) =>
          entry.endsWith("/*")
            ? file.type.startsWith(entry.slice(0, -1))
            : file.type === entry,
        );
      });
      if (invalid) {
        setError(`Plik ${invalid.name} ma niedozwolony format`);
        event.target.value = "";
        return;
      }
    }
    const tooBig = files.find((file) => file.size > maxSizeMb * 1024 * 1024);
    if (tooBig) {
      setError(`Plik ${tooBig.name} przekracza ${maxSizeMb} MB`);
      event.target.value = "";
      return;
    }
    if (cropAspect && files.length === 1) {
      setCropSource(URL.createObjectURL(files[0]));
      event.target.value = "";
      return;
    }
    setBusy(true);
    onBusyChange?.(true);
    const ids: Id<"_storage">[] = [];
    try {
      for (const file of files) {
        ids.push(await uploadBlob(file, file.name));
      }
      onUploaded(ids);
    } catch (err) {
      // Błąd w środku serii nie może gubić plików już wysłanych - inaczej
      // wiszą w storage bez referencji, a admin wysyła wszystko od nowa.
      if (ids.length > 0) onUploaded(ids);
      const base = err instanceof Error ? err.message : "Błąd wysyłania pliku";
      setError(
        ids.length > 0
          ? `${base}. Wysłano ${ids.length} z ${files.length} plików - dodaj brakujące ponownie.`
          : base,
      );
    } finally {
      if (inputRef.current) inputRef.current.value = "";
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  return (
    <div className="grid gap-2">
      <label htmlFor={inputId} className="text-sm font-bold text-navy">
        {label}
      </label>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        disabled={busy}
        aria-describedby={busy || error ? statusId : undefined}
        aria-invalid={error ? true : undefined}
        className="min-h-11 w-full rounded-lg border border-[#7b8b9c] bg-background p-1.5 text-sm font-normal text-[#46586b] outline-none transition-[border-color,box-shadow] file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-bold file:text-secondary-foreground focus:border-secondary focus:ring-3 focus:ring-secondary/15 disabled:cursor-not-allowed disabled:opacity-60"
      />
      {cropAspect && recropUrl ? (
        <button
          type="button"
          onClick={handleRecrop}
          disabled={busy}
          className="justify-self-start text-xs font-bold text-secondary underline-offset-4 hover:underline disabled:opacity-60"
        >
          Wykadruj ponownie aktualne zdjęcie
        </button>
      ) : null}
      {cropAspect ? (
        <ImageCropDialog
          source={cropSource}
          aspect={cropAspect}
          onCancel={() => setCropSource(null)}
          onConfirm={handleCropped}
        />
      ) : null}
      {busy ? (
        <p id={statusId} role="status" className="text-xs font-normal text-muted-foreground">
          Wysyłanie...
        </p>
      ) : null}
      {error ? (
        <p id={statusId} role="alert" className="text-xs font-bold text-[#a61b1b]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
