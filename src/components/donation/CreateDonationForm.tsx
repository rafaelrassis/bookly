"use client";

import { useRef, useState } from "react";
import { Spinner } from "@/components/Spinner";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import { apiErrorMessage } from "@/lib/apiError";
import { UF_LIST } from "@/lib/uf";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024;

type Props = {
  bookId: string;
  /** UF/cidade do perfil do usuário logado, usados pra pré-preencher (ainda editável). */
  defaultState?: string | null;
  defaultCity?: string | null;
  onCreated: () => void;
  onCancel: () => void;
  onToast: (message: string) => void;
};

/** Formulário de "Doar este livro": foto real + localização + contato
 * (ao menos WhatsApp ou Instagram — só libera pro interessado escolhido). */
export function CreateDonationForm({
  bookId,
  defaultState,
  defaultCity,
  onCreated,
  onCancel,
  onToast,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [state, setState] = useState(defaultState ?? "");
  const [city, setCity] = useState(defaultCity ?? "");
  /** Só vira true quando o usuário escolhe uma sugestão do autocomplete —
   * garante que city/state gravados são o nome canônico do IBGE (spec
   * autocomplete de cidades), mesmo que defaultCity/defaultState (perfil)
   * já tenha preenchido o campo com texto livre pré-spec. */
  const [citySelected, setCitySelected] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [saving, setSaving] = useState(false);

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED.has(file.type)) {
      onToast("Use uma imagem JPG, PNG ou WebP");
      return;
    }
    if (file.size > MAX_BYTES) {
      onToast("Imagem muito grande. Máximo 8MB");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload/book-photo", { method: "POST", body: form });
      if (!res.ok) throw new Error(await apiErrorMessage(res, "Falha ao enviar foto."));
      const body = await res.json();
      setPhotoUrl(body.url);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Falha ao enviar foto.");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  const canSubmit =
    !saving && !uploading && photoUrl && state && citySelected && (whatsapp.trim() || instagram.trim());

  async function submit() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const res = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId,
          photoUrl,
          city: city.trim(),
          state,
          whatsapp: whatsapp.trim() || undefined,
          instagram: instagram.trim() || undefined,
        }),
      });
      if (!res.ok) {
        onToast(await apiErrorMessage(res, "Não foi possível registrar a doação"));
        return;
      }
      onToast("Doação criada ✦");
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handlePick}
          className="hidden"
          disabled={uploading}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex w-full items-center gap-3.5 rounded-xl border border-line bg-card2 p-3 text-left transition-colors hover:border-foil/50 disabled:opacity-60"
        >
          <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-card text-paperDim">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- preview otimista local (object URL)
              <img src={preview} alt="" aria-hidden="true" className="h-full w-full object-cover" />
            ) : (
              "📷"
            )}
            {uploading && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Spinner size={18} className="text-white" label="Enviando foto" />
              </span>
            )}
          </span>
          <span className="text-sm font-bold text-paper">
            {photoUrl ? "Trocar foto" : "Adicionar foto real do livro"}
          </span>
        </button>
      </div>

      <div className="flex gap-2">
        <select
          value={state}
          onChange={(e) => {
            setState(e.target.value);
            setCitySelected(false);
          }}
          aria-label="Estado (UF)"
          className="w-24 rounded-xl border border-line bg-card2 px-3 py-2.5 text-sm text-paper"
        >
          <option value="">UF</option>
          {UF_LIST.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>
        <CityAutocomplete
          city={city}
          state={state}
          onCityChange={(value) => {
            setCity(value);
            setCitySelected(false);
          }}
          onSelect={(suggestion) => {
            setCity(suggestion.name);
            setState(suggestion.state);
            setCitySelected(true);
          }}
        />
      </div>
      {!citySelected && (
        <p className="text-xs text-paperMuted">Escolha a cidade na lista de sugestões.</p>
      )}

      <input
        type="tel"
        value={whatsapp}
        onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))}
        placeholder="WhatsApp (DDI+DDD+número, ex.: 5511999999999)"
        aria-label="WhatsApp"
        className="w-full rounded-xl border border-line bg-card2 px-4 py-2.5 text-sm text-paper"
      />
      <input
        type="text"
        value={instagram}
        onChange={(e) => setInstagram(e.target.value)}
        placeholder="Instagram (opcional se já informou WhatsApp)"
        aria-label="Instagram"
        className="w-full rounded-xl border border-line bg-card2 px-4 py-2.5 text-sm text-paper"
      />
      <p className="text-xs text-paperMuted">
        O contato só é revelado pra pessoa que você escolher entre os interessados.
      </p>

      <div className="mt-1 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-4 py-2.5 text-sm font-bold text-paperMuted hover:text-paper"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="flex items-center justify-center rounded-xl bg-foil px-4 py-2.5 text-sm font-bold text-leather disabled:opacity-40"
        >
          {saving ? <Spinner size={16} className="text-leather" /> : "Publicar doação"}
        </button>
      </div>
    </div>
  );
}
