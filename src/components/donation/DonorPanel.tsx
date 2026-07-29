"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Spinner } from "@/components/Spinner";
import { withAt } from "@/lib/handle";
import { apiErrorMessage } from "@/lib/apiError";
import type { ApiDonationRequest, DonationStatus } from "@/lib/types";

type Props = {
  donationId: string;
  status: DonationStatus;
  onStatusChange: (status: DonationStatus) => void;
  onDeleted: () => void;
  onToast: (message: string) => void;
};

/** Painel do doador: fila de interessados, escolher/recusar, marcar como
 * doado e remover a doação. */
export function DonorPanel({ donationId, status, onStatusChange, onDeleted, onToast }: Props) {
  const [requests, setRequests] = useState<ApiDonationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/donations/${donationId}/requests`)
      .then((res) => (res.ok ? res.json() : { requests: [] }))
      .then((data) => !cancelled && setRequests(data.requests ?? []))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [donationId]);

  const chosen = requests.find((r) => r.status === "ESCOLHIDO") ?? null;
  const pending = requests.filter((r) => r.status === "PENDENTE");

  async function escolher(requestId: string) {
    setBusyId(requestId);
    try {
      const res = await fetch(`/api/donations/${donationId}/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "escolher" }),
      });
      if (!res.ok) {
        onToast(await apiErrorMessage(res, "Não foi possível escolher esse interessado"));
        return;
      }
      setRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: "ESCOLHIDO" } : r)));
      onStatusChange("RESERVADO");
      onToast("Interessado escolhido — contato liberado pra ele ✦");
    } finally {
      setBusyId(null);
    }
  }

  async function recusar(requestId: string) {
    setBusyId(requestId);
    try {
      const res = await fetch(`/api/donations/${donationId}/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recusar" }),
      });
      if (!res.ok) {
        onToast(await apiErrorMessage(res, "Não foi possível recusar"));
        return;
      }
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } finally {
      setBusyId(null);
    }
  }

  async function marcarDoado() {
    setBusyId("doado");
    try {
      const res = await fetch(`/api/donations/${donationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "doado" }),
      });
      if (!res.ok) {
        onToast(await apiErrorMessage(res, "Não foi possível marcar como doado"));
        return;
      }
      onStatusChange("DOADO");
      onToast("Doado! Obrigado por compartilhar essa leitura 📖");
    } finally {
      setBusyId(null);
    }
  }

  async function remover() {
    setBusyId("remover");
    try {
      const res = await fetch(`/api/donations/${donationId}`, { method: "DELETE" });
      if (!res.ok) {
        onToast(await apiErrorMessage(res, "Não foi possível remover a doação"));
        return;
      }
      onDeleted();
      onToast("Doação removida");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size={24} className="text-paperDim" label="Carregando interessados" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {status === "DOADO" && <p className="text-sm text-paperDim">Este livro já foi doado. 🎉</p>}

      {status === "RESERVADO" && chosen && (
        <div className="rounded-xl border border-foil/40 bg-card2 p-3">
          <div className="flex items-center gap-2.5">
            <Avatar
              user={withAt(chosen.requester.username ?? chosen.requester.name)}
              avatarIndex={chosen.requester.avatar}
              avatarUrl={chosen.requester.avatarUrl}
              size={32}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{chosen.requester.name}</p>
              <p className="text-xs text-foil">Escolhido — contato liberado</p>
            </div>
          </div>
          <button
            type="button"
            onClick={marcarDoado}
            disabled={busyId !== null}
            className="mt-3 flex w-full items-center justify-center rounded-xl bg-foil px-4 py-2.5 text-sm font-bold text-leather disabled:opacity-40"
          >
            {busyId === "doado" ? <Spinner size={16} className="text-leather" /> : "Marcar como doado"}
          </button>
        </div>
      )}

      {status === "DISPONIVEL" && (
        <>
          {pending.length === 0 ? (
            <p className="text-sm text-paperDim">Ninguém demonstrou interesse ainda.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {pending.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-2.5 rounded-xl border border-line bg-card2 p-3"
                >
                  <Avatar
                    user={withAt(r.requester.username ?? r.requester.name)}
                    avatarIndex={r.requester.avatar}
                    avatarUrl={r.requester.avatarUrl}
                    size={32}
                  />
                  <p className="min-w-0 flex-1 truncate text-sm font-bold">{r.requester.name}</p>
                  <button
                    type="button"
                    onClick={() => recusar(r.id)}
                    disabled={busyId !== null}
                    className="rounded-full px-3 py-1.5 text-xs font-bold text-paperDim hover:text-ribbonText disabled:opacity-40"
                  >
                    Recusar
                  </button>
                  <button
                    type="button"
                    onClick={() => escolher(r.id)}
                    disabled={busyId !== null}
                    className="flex items-center justify-center rounded-full bg-foil px-3 py-1.5 text-xs font-bold text-leather disabled:opacity-40"
                  >
                    {busyId === r.id ? <Spinner size={12} className="text-leather" /> : "Escolher"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {status !== "DOADO" && (
        <button
          type="button"
          onClick={remover}
          disabled={busyId !== null}
          className="mt-1 rounded-xl px-4 py-2.5 text-center text-sm font-bold text-paperDim hover:text-ribbonText disabled:opacity-40"
        >
          {busyId === "remover" ? "Removendo…" : "Remover doação"}
        </button>
      )}
    </div>
  );
}
