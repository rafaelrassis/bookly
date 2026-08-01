"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/Button";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { ErrorRetry } from "@/components/ui/ErrorRetry";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/Skeleton";
import { apiErrorMessage } from "@/lib/apiError";
import { formatShortDate } from "@/lib/format";
import { withAt } from "@/lib/handle";
import { useStore } from "@/lib/store";
import type { ApiReceivedDonation } from "@/lib/types";

type Data = { emAndamento: ApiReceivedDonation[]; recebidos: ApiReceivedDonation[] };

/** "Recebidos" no perfil: espelho de MyDonations do lado de quem recebe — livros em
 * que o usuário foi o interessado escolhido, separados em andamento/já entregues. */
export function ReceivedDonations() {
  const showToast = useStore((s) => s.showToast);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadSignal, setReloadSignal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetch("/api/donations/received")
      .then(async (res) => {
        if (!res.ok)
          throw new Error(
            await apiErrorMessage(res, "Não foi possível carregar os livros que você está recebendo"),
          );
        return res.json();
      })
      .then((d: Data) => !cancelled && setData(d))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [reloadSignal]);

  if (error) return <ErrorRetry message={error} onRetry={() => setReloadSignal((n) => n + 1)} />;
  if (!data) return <ReceivedSkeleton />;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="text-meta uppercase text-paperMuted">Em andamento</h3>
        {data.emAndamento.length === 0 ? (
          <p className="mt-3 text-sm text-paperMuted">
            Quando um doador te escolher, o livro aparece aqui.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {data.emAndamento.map((d) => (
              <ReceivedCard
                key={d.requestId}
                donation={d}
                onConfirmed={() => setReloadSignal((n) => n + 1)}
                onToast={showToast}
              />
            ))}
          </ul>
        )}
      </div>

      {data.recebidos.length > 0 && (
        <div>
          <h3 className="text-meta uppercase text-paperMuted">Recebidos</h3>
          <ul className="mt-3 flex flex-col gap-3">
            {data.recebidos.map((d) => (
              <ReceivedCard
                key={d.requestId}
                donation={d}
                onConfirmed={() => setReloadSignal((n) => n + 1)}
                onToast={showToast}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ReceivedCard({
  donation,
  onConfirmed,
  onToast,
}: {
  donation: ApiReceivedDonation;
  onConfirmed: () => void;
  onToast: (message: string) => void;
}) {
  const donor = donation.donor;
  const donorHandle = withAt(donor.username ?? donor.name);
  const [confirming, setConfirming] = useState(false);
  const [confirmSheetOpen, setConfirmSheetOpen] = useState(false);

  async function confirmarRecebimento() {
    setConfirming(true);
    try {
      const res = await fetch(`/api/donations/${donation.donationId}/confirm-receipt`, {
        method: "PATCH",
      });
      if (!res.ok) {
        onToast(await apiErrorMessage(res, "Não foi possível confirmar o recebimento"));
        return;
      }
      onToast("Recebimento confirmado ✦");
      onConfirmed();
    } finally {
      setConfirming(false);
      setConfirmSheetOpen(false);
    }
  }

  return (
    <li className="rounded-2xl border border-line bg-card p-3.5">
      <div className="flex gap-3">
        <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-card2">
          <Image src={donation.photoUrl} alt="" fill sizes="64px" className="object-cover" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-bold">{donation.bookTitle}</p>
          <p className="mt-0.5 text-xs text-paperMuted">
            {donation.city} · {donation.state}
          </p>

          {donor.username && (
            <Link href={`/u/${donor.username}`} className="mt-2 flex items-center gap-1.5">
              <Avatar user={donorHandle} avatarIndex={donor.avatar} avatarUrl={donor.avatarUrl} size={20} />
              <span className="truncate text-xs font-bold text-paperMuted">{donor.name}</span>
            </Link>
          )}

          {donation.status === "DOADO" ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <StatusBadge tone="neutral">Recebido</StatusBadge>
              {donation.donatedAt && (
                <span className="text-caption text-paperMuted">{formatShortDate(donation.donatedAt)}</span>
              )}
            </div>
          ) : (
            donation.contact &&
            (donation.contact.whatsapp || donation.contact.instagram) && (
              <div className="mt-2 flex flex-wrap gap-2">
                {donation.contact.whatsapp && (
                  <Button variant="primary" asChild>
                    <a
                      href={`https://wa.me/${donation.contact.whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Falar no WhatsApp
                    </a>
                  </Button>
                )}
                {donation.contact.instagram && (
                  <Button variant="secondary" asChild>
                    <a
                      href={`https://instagram.com/${donation.contact.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Instagram
                    </a>
                  </Button>
                )}
              </div>
            )
          )}

          {donation.receiverConfirmedAt ? (
            <StatusBadge tone="positive" className="mt-2 w-fit">
              Você confirmou
            </StatusBadge>
          ) : (
            <Button variant="primary" onClick={() => setConfirmSheetOpen(true)} className="mt-2">
              Confirmei o recebimento
            </Button>
          )}
        </div>
      </div>

      {confirmSheetOpen && (
        <ConfirmSheet
          title="Confirmar recebimento"
          message="Confirma que você recebeu este livro? Isso conclui a doação do seu lado."
          confirmLabel="Confirmei o recebimento"
          busy={confirming}
          onConfirm={confirmarRecebimento}
          onClose={() => setConfirmSheetOpen(false)}
        />
      )}
    </li>
  );
}

function ReceivedSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      {[0, 1].map((section) => (
        <div key={section}>
          <Skeleton className="h-3 w-24" />
          <div className="mt-3 flex flex-col gap-3">
            {[0, 1].map((i) => (
              <div key={i} className="flex gap-3 rounded-2xl border border-line bg-card p-3.5">
                <Skeleton className="h-16 w-16 shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
