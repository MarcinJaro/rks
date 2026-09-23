"use client";

import { useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { AdminEditorDialog } from "@/components/admin/AdminEditorDialog";
import { Button } from "@/components/ui/button";
import { cropImage } from "@/lib/cropImage";

/**
 * Kadrowanie zdjęcia przed wysłaniem. Proporcje ramki odpowiadają kartom
 * na stronie, więc to, co admin zaznaczy, jest dokładnie tym, co zobaczą
 * kibice.
 */
export function ImageCropDialog({
  source,
  aspect,
  onCancel,
  onConfirm,
}: {
  source: string | null;
  aspect: number;
  onCancel: () => void;
  onConfirm: (blob: Blob) => Promise<void> | void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setArea(null);
    setError(null);
  }

  async function handleConfirm() {
    if (!source || !area || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(await cropImage(source, area));
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się wykadrować zdjęcia.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminEditorDialog
      open={source !== null}
      onClose={() => {
        reset();
        onCancel();
      }}
      title="Kadrowanie zdjęcia"
      description="Przesuń zdjęcie i ustaw powiększenie tak, aby twarz była w ramce."
      size="md"
      busy={busy}
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              reset();
              onCancel();
            }}
          >
            Anuluj
          </Button>
          <Button type="button" disabled={busy || !area} onClick={handleConfirm}>
            {busy ? "Zapisywanie..." : "Użyj kadru"}
          </Button>
        </>
      }
    >
      <div className="relative h-[min(60dvh,480px)] overflow-hidden rounded-lg bg-[#071725]">
        {source ? (
          <Cropper
            image={source}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            minZoom={1}
            maxZoom={4}
            zoomSpeed={0.2}
            showGrid
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setArea(pixels)}
          />
        ) : null}
      </div>
      <label className="mt-4 flex items-center gap-3 text-sm font-bold text-navy">
        Powiększenie
        <input
          type="range"
          min={1}
          max={4}
          step={0.01}
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
          className="flex-1 accent-[var(--secondary)]"
          data-dialog-autofocus
        />
      </label>
      {error ? (
        <p role="alert" className="mt-3 text-xs font-bold text-[#a61b1b]">
          {error}
        </p>
      ) : null}
    </AdminEditorDialog>
  );
}
