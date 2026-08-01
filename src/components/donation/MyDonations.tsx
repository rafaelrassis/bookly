"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BottomSheet } from "@/components/BottomSheet";
import { EmptyState } from "@/components/EmptyState";
import { GiftIcon } from "@/components/icons";
import { ErrorRetry } from "@/components/ui/ErrorRetry";
import { Skeleton } from "@/components/Skeleton";
import { apiErrorMessage } from "@/lib/apiError";
import { useStore } from "@/lib/store";
import type { ApiMyDonation, DonationStatus } from "@/lib/types";
import { DonorPanel } from "./DonorPanel";

const STATUS_BADGE: Record<DonationStatus, { label: string; className: string }> = {
  DISPONIVEL: { label: "Disponível", className: "bg-foil/15 text-foil" },
  RESERVADO: { label: "Reservado", className: "bg-ribbon/20 text-ribbonText" },
  DOADO: { label: "Doado", className: "bg-card2 text-paperDim" },
};

export function MyDonations() {
  const showToast = useStore((s) => s.showToast);
  const [donations, setDonations] = useState<ApiMyDonation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadSignal, setReloadSignal] = useState(0);
  const [managingId, setManagingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetch("/api/donations")
      .then(async (res) => {
        if (!res.ok) throw new Error(await apiErrorMessage(res, "Não foi possível carregar suas doações"));
        return res.json();
      })
      .then((data) => !cancelled && setDonations(data.donations ?? []))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [reloadSignal]);

  if (error) return <ErrorRetry message={error} onRetry={() => setReloadSignal((n) => n + 1)} />;
  if (!donations) return <DonationsSkeleton />;

  const managing = donations.find((d) => d.id === managingId) ?? null;
  const ativas = donations.filter((d) => d.status !== "DOADO");
  const doadas = donations.filter((d) => d.status === "DOADO");

  return (
    <div className="flex flex-col gap-8">
      <Section title="Ativas" emptyCta>
        {ativas.map((d) => (
          <DonationCard key={d.id} donation={d} onManage={() => setManagingId(d.id)} />
        ))}
      </Section>

      {doadas.length > 0 && (
        <Section title="Doadas">
          {doadas.map((d) => (
            <DonationCard key={d.id} donation={d} onManage={() => setManagingId(d.id)} />
          ))}
        </Section>
      )}

      {managing && (
        <BottomSheet onClose={() => setManagingId(null)} title="Gerenciar doação">
          <DonorPanel
            donationId={managing.id}
            status={managing.status}
            onStatusChange={(status) =>
              setDonations((prev) =>
                prev ? prev.map((d) => (d.id === managing.id ? { ...d, status } : d)) : prev
              )
            }
            onDeleted={() => {
              setDonations((prev) => (prev ? prev.filter((d) => d.id !== managing.id) : prev));
              setManagingId(null);
            }}
            onToast={showToast}
          />
        </BottomSheet>
      )}
    </div>
  );
}

function Section({
  title,
  emptyCta,
  children,
}: {
  title: string;
  emptyCta?: boolean;
  children: React.ReactNode;
}) {
  const isEmpty = Array.isArray(children) ? children.length === 0 : !children;

  return (
    <div>
      <h3 className="text-xs font-extrabold uppercase tracking-[0.18em] text-paperDim">{title}</h3>
      {isEmpty ? (
        emptyCta ? (
          <EmptyState
            icon={<GiftIcon size={32} />}
            title="Nenhuma doação ativa"
            description="Coloque um livro que você já leu pra doar e ajude outro leitor a começar."
            action={{ label: "Doe um livro", href: "/search" }}
          />
        ) : null
      ) : (
        <ul className="mt-3 flex flex-col gap-3">{children}</ul>
      )}
    </div>
  );
}

function DonationCard({ donation, onManage }: { donation: ApiMyDonation; onManage: () => void }) {
  const badge = STATUS_BADGE[donation.status];
  const showPending = donation.status !== "DOADO" && donation.pendingRequests > 0;
  const receiptBadge =
    donation.status === "DOADO"
      ? donation.receiverConfirmedAt
        ? { label: "Recebimento confirmado", className: "bg-foil/15 text-foil" }
        : { label: "Aguardando confirmação", className: "bg-card2 text-paperDim" }
      : null;

  return (
    <li>
      <button
        type="button"
        onClick={onManage}
        className="flex w-full gap-3 rounded-2xl border border-line bg-card p-3.5 text-left transition-colors hover:bg-card2"
      >
        <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-card2">
          <Image src={donation.photoUrl} alt="" fill sizes="64px" className="object-cover" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-bold">{donation.bookTitle}</p>
          <p className="mt-0.5 text-xs text-paperDim">
            {donation.city} · {donation.state}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${badge.className}`}>
              {badge.label}
            </span>
            {showPending && (
              <span className="rounded-full bg-ribbon/15 px-2.5 py-1 text-[11px] font-bold text-ribbon">
                {donation.pendingRequests} {donation.pendingRequests === 1 ? "pedido" : "pedidos"}
              </span>
            )}
            {receiptBadge && (
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${receiptBadge.className}`}>
                {receiptBadge.label}
              </span>
            )}
          </div>
        </div>
      </button>
    </li>
  );
}

function DonationsSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      {[0, 1].map((section) => (
        <div key={section}>
          <Skeleton className="h-3 w-16" />
          <div className="mt-3 flex flex-col gap-3">
            {[0, 1].map((i) => (
              <div key={i} className="flex gap-3 rounded-2xl border border-line bg-card p-3.5">
                <Skeleton className="h-16 w-16 shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
