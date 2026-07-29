"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { SectionError } from "@/components/SectionError";
import { Skeleton } from "@/components/Skeleton";
import { apiErrorMessage } from "@/lib/apiError";
import { formatShortDate } from "@/lib/format";
import { withAt } from "@/lib/handle";
import type { ApiReceivedDonation } from "@/lib/types";

type Data = { emAndamento: ApiReceivedDonation[]; recebidos: ApiReceivedDonation[] };

/** "Recebidos" no perfil: espelho de MyDonations do lado de quem recebe — livros em
 * que o usuário foi o interessado escolhido, separados em andamento/já entregues. */
export function ReceivedDonations() {
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

  if (error) return <SectionError message={error} onRetry={() => setReloadSignal((n) => n + 1)} />;
  if (!data) return <ReceivedSkeleton />;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="text-xs font-extrabold uppercase tracking-[0.18em] text-paperDim">Em andamento</h3>
        {data.emAndamento.length === 0 ? (
          <p className="mt-3 text-sm text-paperDim">
            Quando um doador te escolher, o livro aparece aqui.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {data.emAndamento.map((d) => (
              <ReceivedCard key={d.requestId} donation={d} />
            ))}
          </ul>
        )}
      </div>

      {data.recebidos.length > 0 && (
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-[0.18em] text-paperDim">Recebidos</h3>
          <ul className="mt-3 flex flex-col gap-3">
            {data.recebidos.map((d) => (
              <ReceivedCard key={d.requestId} donation={d} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ReceivedCard({ donation }: { donation: ApiReceivedDonation }) {
  const donor = donation.donor;
  const donorHandle = withAt(donor.username ?? donor.name);

  return (
    <li className="rounded-2xl border border-line bg-card p-3.5">
      <div className="flex gap-3">
        <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-card2">
          <Image src={donation.photoUrl} alt="" fill sizes="64px" className="object-cover" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-bold">{donation.bookTitle}</p>
          <p className="mt-0.5 text-xs text-paperDim">
            {donation.city} · {donation.state}
          </p>

          {donor.username && (
            <Link href={`/u/${donor.username}`} className="mt-2 flex items-center gap-1.5">
              <Avatar user={donorHandle} avatarIndex={donor.avatar} avatarUrl={donor.avatarUrl} size={20} />
              <span className="truncate text-xs font-bold text-paperDim">{donor.name}</span>
            </Link>
          )}

          {donation.status === "DOADO" ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-card2 px-2.5 py-1 text-[11px] font-bold text-paperDim">
                Recebido
              </span>
              {donation.donatedAt && (
                <span className="text-[11px] text-paperDim">{formatShortDate(donation.donatedAt)}</span>
              )}
            </div>
          ) : (
            donation.contact &&
            (donation.contact.whatsapp || donation.contact.instagram) && (
              <div className="mt-2 flex flex-wrap gap-2">
                {donation.contact.whatsapp && (
                  <a
                    href={`https://wa.me/${donation.contact.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-foil px-3 py-1 text-xs font-bold text-leather"
                  >
                    Falar no WhatsApp
                  </a>
                )}
                {donation.contact.instagram && (
                  <a
                    href={`https://instagram.com/${donation.contact.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-line px-3 py-1 text-xs font-bold text-paper"
                  >
                    Instagram
                  </a>
                )}
              </div>
            )
          )}
        </div>
      </div>
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
