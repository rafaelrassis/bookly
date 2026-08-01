"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/EmptyState";
import { ErrorRetry } from "@/components/ui/ErrorRetry";
import { GiftIcon } from "@/components/icons";
import { Skeleton } from "@/components/Skeleton";
import { DonationCard } from "@/components/donation/DonationCard";
import { apiErrorMessage } from "@/lib/apiError";
import { getDonationTurn } from "@/lib/donation-state";
import { handleTablistKeyDown } from "@/lib/tablist";
import type { ApiMyDonation, ApiReceivedDonation } from "@/lib/types";

type Tab = "ativas" | "concluidas";

type CardItem = {
  key: string;
  href: string;
  photoUrl: string;
  title: string;
  city: string;
  uf: string;
  role: "donor" | "receiver";
  counterpartName: string | null;
  status: ApiMyDonation["status"];
  sortAt: string;
  turn: ReturnType<typeof getDonationTurn>;
};

function fromMine(d: ApiMyDonation): CardItem {
  return {
    key: `donor-${d.id}`,
    href: `/donations/${d.id}`,
    photoUrl: d.photoUrl,
    title: d.bookTitle,
    city: d.city,
    uf: d.state,
    role: "donor",
    counterpartName: d.chosenReceiver?.name ?? null,
    status: d.status,
    sortAt: d.donatedAt ?? d.createdAt,
    turn: getDonationTurn({
      status: d.status,
      role: "donor",
      counterpartName: d.chosenReceiver?.name ?? null,
      pendingCount: d.pendingRequests,
      receiverConfirmedAt: d.receiverConfirmedAt,
      reservedAt: d.reservedAt,
    }),
  };
}

function fromReceived(d: ApiReceivedDonation): CardItem {
  return {
    key: `receiver-${d.donationId}`,
    href: `/donations/${d.donationId}`,
    photoUrl: d.photoUrl,
    title: d.bookTitle,
    city: d.city,
    uf: d.state,
    role: "receiver",
    counterpartName: d.donor.name,
    status: d.status,
    sortAt: d.donatedAt ?? d.createdAt,
    turn: getDonationTurn({
      status: d.status,
      role: "receiver",
      counterpartName: d.donor.name,
      pendingCount: 0,
      receiverConfirmedAt: d.receiverConfirmedAt,
      reservedAt: d.reservedAt,
    }),
  };
}

/**
 * Painel `/profile/doacoes`: substitui MyDonations + ReceivedDonations (e,
 * junto com elas, o "Gerenciar doação" que abria DonorPanel) por um único
 * painel Ativas/Concluídas — cada card usa DonationCard, que já resolve
 * "de quem é a vez" (lib/donation-state). Clicar num card leva pra
 * `/donations/[id]`, onde a negociação de fato acontece.
 */
export function DonationsPanel() {
  const [mine, setMine] = useState<ApiMyDonation[] | null>(null);
  const [received, setReceived] = useState<ApiReceivedDonation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadSignal, setReloadSignal] = useState(0);
  const [tab, setTab] = useState<Tab>("ativas");

  useEffect(() => {
    let cancelled = false;
    setError(null);
    Promise.all([
      fetch("/api/donations").then(async (res) => {
        if (!res.ok) throw new Error(await apiErrorMessage(res, "Não foi possível carregar suas doações"));
        return res.json();
      }),
      fetch("/api/donations/received").then(async (res) => {
        if (!res.ok)
          throw new Error(await apiErrorMessage(res, "Não foi possível carregar os livros que você está recebendo"));
        return res.json();
      }),
    ])
      .then(([myData, receivedData]: [{ donations: ApiMyDonation[] }, { emAndamento: ApiReceivedDonation[]; recebidos: ApiReceivedDonation[] }]) => {
        if (cancelled) return;
        setMine(myData.donations ?? []);
        setReceived([...(receivedData.emAndamento ?? []), ...(receivedData.recebidos ?? [])]);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [reloadSignal]);

  const items = useMemo(() => {
    if (!mine || !received) return null;
    return [...mine.map(fromMine), ...received.map(fromReceived)];
  }, [mine, received]);

  if (error) return <ErrorRetry message={error} onRetry={() => setReloadSignal((n) => n + 1)} />;
  if (!items) return <DonationsPanelSkeleton />;

  const ativas = items
    .filter((i) => i.status !== "DOADO")
    .sort((a, b) => {
      if (a.turn.state !== b.turn.state) return a.turn.state === "sua-vez" ? -1 : 1;
      return b.sortAt.localeCompare(a.sortAt);
    });
  const concluidas = items.filter((i) => i.status === "DOADO").sort((a, b) => b.sortAt.localeCompare(a.sortAt));

  const list = tab === "ativas" ? ativas : concluidas;

  return (
    <div>
      {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus -- onKeyDown aqui só delega a navegação por setas pros [role=tab] filhos (já focáveis) */}
      <div
        role="tablist"
        aria-label="Doações"
        className="flex gap-2"
        onKeyDown={handleTablistKeyDown}
      >
        <Chip
          role="tab"
          id="donations-tab-ativas"
          aria-controls="donations-panel-ativas"
          aria-selected={tab === "ativas"}
          active={tab === "ativas"}
          onClick={() => setTab("ativas")}
        >
          Ativas · {ativas.length}
        </Chip>
        <Chip
          role="tab"
          id="donations-tab-concluidas"
          aria-controls="donations-panel-concluidas"
          aria-selected={tab === "concluidas"}
          active={tab === "concluidas"}
          onClick={() => setTab("concluidas")}
        >
          Concluídas · {concluidas.length}
        </Chip>
      </div>

      <div
        id={tab === "ativas" ? "donations-panel-ativas" : "donations-panel-concluidas"}
        role="tabpanel"
        aria-labelledby={tab === "ativas" ? "donations-tab-ativas" : "donations-tab-concluidas"}
        tabIndex={0}
      >
        {list.length === 0 ? (
          tab === "ativas" ? (
            <EmptyState
              icon={<GiftIcon size={32} />}
              title="Nenhuma doação ativa"
              description="Coloque um livro que você já leu pra doar e ajude outro leitor a começar."
              action={{ label: "Doar um livro da estante", href: "/shelf" }}
            />
          ) : (
            <p className="mt-4 text-sm text-paperMuted">Nenhuma doação concluída ainda.</p>
          )
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {list.map((item) => (
              <DonationCard
                key={item.key}
                href={item.href}
                photoUrl={item.photoUrl}
                title={item.title}
                city={item.city}
                uf={item.uf}
                role={item.role}
                counterpartName={item.counterpartName}
                turn={item.turn}
              />
            ))}
          </ul>
        )}
      </div>

      {list.length > 0 && (
        <Button variant="secondary" asChild className="mt-5">
          <Link href="/shelf">Doar um livro da estante</Link>
        </Button>
      )}
    </div>
  );
}

function DonationsPanelSkeleton() {
  return (
    <div>
      <div className="flex gap-2">
        <Skeleton className="h-11 w-24 rounded-full" />
        <Skeleton className="h-11 w-32 rounded-full" />
      </div>
      <div className="mt-3 flex flex-col gap-3">
        {[0, 1].map((i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-line bg-card">
            <Skeleton className="h-6 w-full" />
            <div className="flex gap-3 p-3.5">
              <Skeleton className="h-16 w-16 shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
