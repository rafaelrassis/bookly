"use client";

import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import { getCroppedBlob, type Area } from "@/lib/cropImage";
import { useModalA11y } from "@/lib/useModalA11y";

type Props = {
  src: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void | Promise<void>;
};

export function AvatarCropModal({ src, onCancel, onConfirm }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const dialogRef = useModalA11y<HTMLDivElement>(onCancel);

  const onCropComplete = useCallback((_croppedArea: Area, pixels: Area) => {
    setArea(pixels);
  }, []);

  async function handleConfirm() {
    if (!area || busy) return;
    setBusy(true);
    try {
      const blob = await getCroppedBlob(src, area, rotation);
      await onConfirm(blob);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Editar foto de perfil"
        tabIndex={-1}
        className="flex flex-1 flex-col focus:outline-none"
      >
        <div className="relative flex-1">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="space-y-4 border-t border-line bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-paper">
          <label className="block text-xs font-bold uppercase tracking-wide text-paperMuted">
            Zoom
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="mt-1 w-full accent-foil"
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="shrink-0 rounded-full border border-line bg-card2 px-4 py-2 text-sm font-bold text-paper"
            >
              Girar 90°
            </button>
            <input
              type="range"
              min={0}
              max={360}
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="flex-1 accent-foil"
              aria-label="Rotação"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="rounded-full px-5 py-2 text-sm font-bold text-paperMuted disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={busy || !area}
              className="rounded-full bg-foil px-5 py-2 text-sm font-bold text-leather transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Enviando…" : "Confirmar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
