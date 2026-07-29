"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BottomSheet } from "@/components/BottomSheet";
import { Spinner } from "@/components/Spinner";
import { GiftIcon } from "@/components/icons";
import { apiErrorMessage } from "@/lib/apiError";
import type { ApiDonation, DonationStatus } from "@/lib/types";
import { DonorPanel } from "./DonorPanel";

const UF_LIST = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const STATUS_LABEL: Record<DonationStatus, string> = {
  DISPONIVEL: "Disponível",
  RESERVADO: "Reservado",
  DOADO: "Doado",
};

type Props = {
  bookId: string;
  myUf?: string;
  reloadSignal: number;
  onToast: (message: string) => void;
};

export function DonationList({ bookId, myUf, reloadSignal, onToast }: Props) {
  const [donations, setDonations] = useState<ApiDonation[]>([]);
  const [loading, setLoading] = useState(true);
  const [wholeCountry, setWholeCountry] = useState(!myUf);
  const [uf, setUf] = useState(myUf ?? "");
  const [managingId, setManagingId] = useState<string | null>(null);
  const [requestingId, setRequestingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (!wholeCountry && uf) params.set("uf", uf);
    fetch(`/api/books/${bookId}/donations?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : { donations: [] }))
      .then((data) => !cancelled && setDonations(data.donations ?? []))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [bookId, wholeCountry, uf, reloadSignal]);

  async function quero(donationId: string) {
    setRequestingId(donationId);
    try {
      const res = await fetch(`/api/donations/${donationId}/requests`, { method: "POST" });
      if (!res.ok) {
        onToast(await apiErrorMessage(res, "Não foi possível registrar seu interesse"));
        return;
      }
      setDonations((prev) =>
        prev.map((d) =>
          d.id === donationId ? { ...d, myRequest: { id: "", status: "PENDENTE" } } : d
        )
      );
      onToast("Interesse enviado ✦");
    } finally {
      setRequestingId(null);
    }
  }

  const managing = donations.find((d) => d.id === managingId) ?? null;

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setWholeCountry((v) => !v)}
          aria-pressed={wholeCountry}
          className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
            wholeCountry ? "bg-foil text-leather" : "border border-line bg-card text-paperDim hover:text-paper"
          }`}
        >
          Todo o Brasil
        </button>
        {!wholeCountry && (
          <select
            value={uf}
            onChange={(e) => setUf(e.target.value)}
            aria-label="Filtrar por estado (UF)"
            className="rounded-full border border-line bg-card px-3 py-1.5 text-xs font-bold text-paper"
          >
            <option value="">Todos os estados</option>
            {UF_LIST.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner size={22} className="text-paperDim" label="Carregando doações" />
        </div>
      ) : donations.length === 0 ? (
        <p className="mt-3 text-sm text-paperDim">
          Nenhuma doação disponível deste livro por aqui ainda.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {donations.map((d) => (
            <li key={d.id} className="rounded-2xl border border-line bg-card p-3.5">
              <div className="flex gap-3">
                <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-card2">
                  <Image src={d.photoUrl} alt="" fill sizes="64px" className="object-cover" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">
                    {d.city} · {d.state}
                  </p>
                  <p className="mt-0.5 text-xs text-paperDim">{STATUS_LABEL[d.status]}</p>

                  {d.isDonor ? (
                    <button
                      type="button"
                      onClick={() => setManagingId(d.id)}
                      className="mt-2 rounded-full bg-foil/15 px-3 py-1 text-xs font-bold text-foil"
                    >
                      Sua doação · gerenciar{d.requestCount > 0 ? ` (${d.requestCount})` : ""}
                    </button>
                  ) : d.myRequest?.status === "ESCOLHIDO" && d.contact ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {d.contact.whatsapp && (
                        <a
                          href={`https://wa.me/${d.contact.whatsapp}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full bg-foil px-3 py-1 text-xs font-bold text-leather"
                        >
                          WhatsApp
                        </a>
                      )}
                      {d.contact.instagram && (
                        <a
                          href={`https://instagram.com/${d.contact.instagram}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-line px-3 py-1 text-xs font-bold text-paper"
                        >
                          @{d.contact.instagram}
                        </a>
                      )}
                    </div>
                  ) : d.myRequest ? (
                    <p className="mt-2 text-xs font-bold text-paperDim">Interesse enviado</p>
                  ) : d.status === "DISPONIVEL" ? (
                    <button
                      type="button"
                      onClick={() => quero(d.id)}
                      disabled={requestingId === d.id}
                      className="mt-2 flex items-center gap-1.5 rounded-full bg-foil px-3 py-1.5 text-xs font-bold text-leather disabled:opacity-40"
                    >
                      {requestingId === d.id ? (
                        <Spinner size={12} className="text-leather" />
                      ) : (
                        <GiftIcon size={11} />
                      )}
                      Quero este
                    </button>
                  ) : (
                    <p className="mt-2 text-xs text-paperDim">Já reservado com outra pessoa</p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {managing && (
        <BottomSheet onClose={() => setManagingId(null)} title="Gerenciar doação">
          <DonorPanel
            donationId={managing.id}
            status={managing.status}
            onStatusChange={(status) =>
              setDonations((prev) => prev.map((d) => (d.id === managing.id ? { ...d, status } : d)))
            }
            onDeleted={() => {
              setDonations((prev) => prev.filter((d) => d.id !== managing.id));
              setManagingId(null);
            }}
            onToast={onToast}
          />
        </BottomSheet>
      )}
    </div>
  );
}
