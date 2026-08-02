"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { BackHeader } from "@/components/BackHeader";
import { PageLoader } from "@/components/PageLoader";
import { Spinner } from "@/components/Spinner";
import { Button } from "@/components/ui/Button";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { ErrorRetry } from "@/components/ui/ErrorRetry";
import { apiErrorMessage } from "@/lib/apiError";
import { formatNotificationTime } from "@/lib/format";
import { formatDeadlinePhrase, getDonationTurn, turnChipLabel } from "@/lib/donation-state";
import { withAt } from "@/lib/handle";
import { useStore } from "@/lib/store";
import type { ApiDonationDetail } from "@/lib/types";

type Status = "loading" | "ok" | "notfound" | "forbidden" | "error";
type ConfirmAction = "entrega" | "recebimento" | "cancelar" | null;

/**
 * Tela de negociação de uma doação — substitui o sheet "Gerenciar doação"
 * (DonorPanel) e os botões inline espalhados em MyDonations/ReceivedDonations
 * por uma tela própria: bloco "Sua vez" no topo (um rótulo, uma frase, um
 * botão), linha do tempo, contato da contraparte, e só depois de uma
 * divisória as ações de saída (estender prazo, cancelar).
 */
export function DonationDetailClient({ donationId }: { donationId: string }) {
  const router = useRouter();
  const showToast = useStore((s) => s.showToast);

  const [donation, setDonation] = useState<ApiDonationDetail | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const load = useCallback(() => {
    setStatus((s) => (s === "ok" ? s : "loading"));
    fetch(`/api/donations/${donationId}`)
      .then((res) => {
        if (res.status === 404) {
          setStatus("notfound");
          return null;
        }
        if (res.status === 401 || res.status === 403) {
          setStatus("forbidden");
          return null;
        }
        if (!res.ok) {
          setStatus("error");
          return null;
        }
        return res.json();
      })
      .then((data: ApiDonationDetail | null) => {
        if (data) {
          setDonation(data);
          setStatus("ok");
        }
      })
      .catch(() => setStatus("error"));
  }, [donationId]);

  useEffect(() => {
    load();
  }, [load]);

  async function escolher(requestId: string) {
    if (busy) return;
    setBusy(requestId);
    try {
      const res = await fetch(`/api/donations/${donationId}/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "escolher" }),
      });
      if (!res.ok) {
        showToast(await apiErrorMessage(res, "Não foi possível escolher esse interessado"));
        return;
      }
      showToast("Interessado escolhido — contato liberado pra ele ✦");
      load();
    } finally {
      setBusy(null);
    }
  }

  async function confirmarEntrega() {
    setBusy("entrega");
    try {
      const res = await fetch(`/api/donations/${donationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "doado" }),
      });
      if (!res.ok) {
        showToast(await apiErrorMessage(res, "Não foi possível marcar como doado"));
        return;
      }
      showToast("Doado! Obrigado por compartilhar essa leitura 📖");
      load();
    } finally {
      setBusy(null);
      setConfirmAction(null);
    }
  }

  async function confirmarRecebimento() {
    setBusy("recebimento");
    try {
      const res = await fetch(`/api/donations/${donationId}/confirm-receipt`, { method: "PATCH" });
      if (!res.ok) {
        showToast(await apiErrorMessage(res, "Não foi possível confirmar o recebimento"));
        return;
      }
      showToast("Recebimento confirmado ✦");
      load();
    } finally {
      setBusy(null);
      setConfirmAction(null);
    }
  }

  async function estenderPrazo() {
    setBusy("estender");
    try {
      const res = await fetch(`/api/donations/${donationId}/extend-reserve`, { method: "PATCH" });
      if (!res.ok) {
        showToast(await apiErrorMessage(res, "Não foi possível estender o prazo"));
        return;
      }
      showToast("Prazo renovado por mais 7 dias.");
      load();
    } finally {
      setBusy(null);
    }
  }

  async function cancelar() {
    if (!donation) return;
    setBusy("cancelar");
    try {
      if (donation.status === "RESERVADO") {
        // Cancela só a reserva — o livro volta a DISPONIVEL e continua
        // listado (a doação em si não é apagada, ver PATCH cancelar-reserva).
        const res = await fetch(`/api/donations/${donationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "cancelar-reserva" }),
        });
        if (!res.ok) {
          showToast(await apiErrorMessage(res, "Não foi possível cancelar a reserva"));
          return;
        }
        showToast("Reserva cancelada — o livro está disponível de novo");
        load();
        return;
      }

      const res = await fetch(`/api/donations/${donationId}`, { method: "DELETE" });
      if (!res.ok) {
        showToast(await apiErrorMessage(res, "Não foi possível remover a doação"));
        return;
      }
      showToast("Doação removida");
      router.push("/profile/doacoes");
    } finally {
      setBusy(null);
      setConfirmAction(null);
    }
  }

  if (status === "notfound") {
    return (
      <div className="pt-4">
        <BackHeader />
        <p className="mt-10 text-center text-paperMuted">Doação não encontrada.</p>
      </div>
    );
  }
  if (status === "forbidden") {
    return (
      <div className="pt-4">
        <BackHeader />
        <p className="mt-10 text-center text-paperMuted">
          Você não tem acesso a essa doação.
        </p>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="pt-4">
        <BackHeader />
        <ErrorRetry className="mt-10" message="Não foi possível carregar a doação. Tente de novo." onRetry={load} />
      </div>
    );
  }
  if (status === "loading" || !donation) {
    return (
      <div className="pt-4">
        <BackHeader />
        <PageLoader />
      </div>
    );
  }

  const turn = getDonationTurn({
    status: donation.status,
    role: donation.myRole,
    counterpartName: donation.counterpart?.name ?? null,
    pendingCount: donation.requests?.length ?? 0,
    receiverConfirmedAt: donation.receiverConfirmedAt,
    reservedAt: donation.reservedAt,
  });

  const direction =
    donation.myRole === "donor"
      ? donation.counterpart
        ? `Você doa · para ${donation.counterpart.name}`
        : "Você doa"
      : `Você recebe · de ${donation.donor.name}`;

  const showExitActions = donation.myRole === "donor" && donation.status !== "DOADO";

  return (
    <div className="pt-4 pb-8">
      <BackHeader>
        <h1 className="min-w-0 flex-1 truncate font-display text-title font-bold">{donation.book.title}</h1>
      </BackHeader>

      <div className="mt-4 flex gap-3">
        <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-card2">
          <Image src={donation.photoUrl} alt="" fill sizes="80px" className="object-cover" />
        </span>
        <div className="min-w-0 flex-1 self-center">
          <p className="text-sm font-bold text-paper">{direction}</p>
          <p className="mt-0.5 text-xs text-paperMuted">
            {donation.city} · {donation.state}
          </p>
        </div>
      </div>

      {/* Bloco 1 — a regra que organiza tudo: "Sua vez" (um botão) ou "Aguardando" (uma frase) */}
      <section
        className={`mt-5 rounded-2xl border p-4 ${
          turn.state === "sua-vez" ? "border-foil/40 bg-card2" : "border-line bg-card"
        }`}
      >
        <p className={`text-meta uppercase ${turn.state === "sua-vez" ? "text-foil" : "text-paperMuted"}`}>
          {turnChipLabel(turn.state)}
        </p>
        {turn.state !== "concluida" && turn.deadline && (
          <p className="mt-1 text-caption text-paperMuted">{formatDeadlinePhrase(turn.deadline)}</p>
        )}
        <p className="mt-2 text-body font-bold">{turn.sentence}</p>

        {turn.state === "sua-vez" && turn.action === "escolher" && (
          <ul className="mt-4 flex flex-col gap-2.5">
            {(donation.requests ?? []).map((r) => (
              <li key={r.id} className="flex items-center gap-2.5 rounded-xl border border-line bg-card p-3">
                <Avatar
                  user={withAt(r.requester.username ?? r.requester.name)}
                  avatarIndex={r.requester.avatar}
                  avatarUrl={r.requester.avatarUrl}
                  size={32}
                />
                <p className="min-w-0 flex-1 truncate text-sm font-bold">{r.requester.name}</p>
                <Button
                  variant="primary"
                  onClick={() => escolher(r.id)}
                  disabled={busy !== null}
                  style={{ minHeight: 48 }}
                >
                  {busy === r.id ? <Spinner size={14} className="text-leather" /> : "Escolher"}
                </Button>
              </li>
            ))}
          </ul>
        )}

        {turn.state === "sua-vez" && turn.action === "confirmar-entrega" && (
          <>
            <Button
              variant="primary"
              full
              onClick={() => setConfirmAction("entrega")}
              disabled={busy !== null}
              className="mt-4"
              style={{ minHeight: 48 }}
            >
              Confirmar entrega
            </Button>
            <p className="mt-2 text-caption text-paperMuted">Pede confirmação antes de concluir</p>
          </>
        )}

        {turn.state === "sua-vez" && turn.action === "confirmar-recebimento" && (
          <>
            <Button
              variant="primary"
              full
              onClick={() => setConfirmAction("recebimento")}
              disabled={busy !== null}
              className="mt-4"
              style={{ minHeight: 48 }}
            >
              Confirmar recebimento
            </Button>
            <p className="mt-2 text-caption text-paperMuted">Pede confirmação antes de concluir</p>
          </>
        )}
      </section>

      {/* Bloco 2 — linha do tempo: quem fez o quê e quando, do mais recente ao anúncio */}
      <section className="mt-6">
        <h2 className="text-meta uppercase text-paperMuted">Linha do tempo</h2>
        <ol className="mt-3 flex flex-col gap-3">
          {donation.timeline.map((entry) => (
            <li key={entry.key} className="flex gap-2.5">
              {entry.actor ? (
                <Avatar
                  user={withAt(entry.actor.username ?? entry.actor.name)}
                  avatarIndex={entry.actor.avatar}
                  avatarUrl={entry.actor.avatarUrl}
                  size={28}
                  className="shrink-0"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-card2 text-paperMuted"
                >
                  ✦
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm">{entry.sentence}</p>
                <p className="text-caption text-paperMuted">{formatNotificationTime(entry.createdAt)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Bloco 3 — contato da contraparte */}
      <section className="mt-6">
        <h2 className="text-meta uppercase text-paperMuted">Contato</h2>
        {donation.counterpart ? (
          <>
            {donation.counterpart.username ? (
              <Link
                href={`/u/${donation.counterpart.username}`}
                className="tap mt-3 flex items-center gap-2.5 rounded-xl"
              >
                <Avatar
                  user={withAt(donation.counterpart.username)}
                  avatarIndex={donation.counterpart.avatar}
                  avatarUrl={donation.counterpart.avatarUrl}
                  size={36}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{donation.counterpart.name}</span>
              </Link>
            ) : (
              <div className="mt-3 flex items-center gap-2.5">
                <Avatar
                  user={withAt(donation.counterpart.name)}
                  avatarIndex={donation.counterpart.avatar}
                  avatarUrl={donation.counterpart.avatarUrl}
                  size={36}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{donation.counterpart.name}</span>
              </div>
            )}

            {donation.contact?.whatsapp ? (
              <Button variant="primary" asChild className="mt-3">
                <a href={`https://wa.me/${donation.contact.whatsapp}`} target="_blank" rel="noopener noreferrer">
                  Abrir conversa
                </a>
              </Button>
            ) : donation.contact?.instagram ? (
              <Button variant="secondary" asChild className="mt-3">
                <a
                  href={`https://instagram.com/${donation.contact.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir conversa no Instagram
                </a>
              </Button>
            ) : null}
          </>
        ) : (
          <p className="mt-3 text-sm text-paperMuted">
            {donation.myRole === "donor" ? "Ainda não há ninguém escolhido." : "Aguardando o doador escolher."}
          </p>
        )}
      </section>

      {/* Divisória — só depois dela ficam as ações de saída */}
      {showExitActions && (
        <>
          <hr className="mt-6 border-line" />
          <div className="mt-4 flex flex-col-reverse gap-2 xs:flex-row xs:justify-end">
            {donation.status === "RESERVADO" && (
              <Button variant="secondary" onClick={estenderPrazo} disabled={busy !== null}>
                {busy === "estender" ? <Spinner size={14} className="text-paper" /> : "Estender prazo em 7 dias"}
              </Button>
            )}
            <Button
              variant="dangerGhost"
              onClick={() => setConfirmAction("cancelar")}
              disabled={busy !== null}
            >
              {donation.status === "RESERVADO" ? "Cancelar reserva" : "Remover doação"}
            </Button>
          </div>
        </>
      )}

      {confirmAction === "entrega" && (
        <ConfirmSheet
          title="Confirmar entrega"
          message="O livro passa a constar como doado, e a avaliação do recebedor é liberada. Não dá pra desfazer."
          confirmLabel="Confirmar entrega"
          busy={busy === "entrega"}
          onConfirm={confirmarEntrega}
          onClose={() => setConfirmAction(null)}
        />
      )}
      {confirmAction === "recebimento" && (
        <ConfirmSheet
          title="Confirmar recebimento"
          message="Confirma que você recebeu este livro? Isso conclui a doação do seu lado."
          confirmLabel="Confirmar recebimento"
          busy={busy === "recebimento"}
          onConfirm={confirmarRecebimento}
          onClose={() => setConfirmAction(null)}
        />
      )}
      {confirmAction === "cancelar" && donation && (
        <ConfirmSheet
          title={donation.status === "RESERVADO" ? "Cancelar reserva" : "Remover doação"}
          message={
            donation.status === "RESERVADO"
              ? "O livro volta a ficar disponível para outros interessados. Não dá pra desfazer."
              : "O livro sai da lista de doações. Não dá pra desfazer."
          }
          confirmLabel={donation.status === "RESERVADO" ? "Cancelar reserva" : "Remover doação"}
          danger
          busy={busy === "cancelar"}
          onConfirm={cancelar}
          onClose={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
