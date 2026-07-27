"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Spinner } from "@/components/Spinner";
import { withAt } from "@/lib/handle";
import { useStore } from "@/lib/store";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

/** Upload real de avatar: valida no client, sobe pra /api/upload/avatar (Blob
 * + resize server-side) com preview otimista, e atualiza o store no sucesso. */
export function AvatarUpload() {
  const username = useStore((s) => s.user.username);
  const applyProfile = useStore((s) => s.applyProfile);
  const showToast = useStore((s) => s.showToast);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED.has(file.type)) {
      showToast("Use uma imagem JPG, PNG ou WebP");
      return;
    }
    if (file.size > MAX_BYTES) {
      showToast("Imagem muito grande. Máximo 5MB");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload/avatar", { method: "POST", body: form });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Falha ao enviar imagem.");
      applyProfile({ avatarUrl: body.url });
      showToast("Foto atualizada ✦");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Falha ao enviar imagem.");
    } finally {
      URL.revokeObjectURL(objectUrl);
      setPreview(null);
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-16 w-16 shrink-0">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- preview otimista local (object URL)
          <img src={preview} alt="" aria-hidden="true" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <Avatar user={withAt(username)} size={64} />
        )}
        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Spinner size={20} className="text-white" label="Enviando foto" />
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleChange}
          className="hidden"
          disabled={uploading}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-full border border-line bg-card px-4 py-2 text-xs font-bold text-paper transition-colors hover:bg-card2 disabled:opacity-60"
        >
          {uploading ? "Enviando…" : "Trocar foto"}
        </button>
      </div>
    </div>
  );
}
