"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BottomSheet } from "@/components/BottomSheet";
import { Spinner } from "@/components/Spinner";
import { GiftIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { apiErrorMessage } from "@/lib/apiError";
import type { ApiDonation, DonationStatus } from "@/lib/types";
import { UF_LIST } from "@/lib/uf";
import { DonorPanel } from "./DonorPanel";

const STATUS_LABEL: Record<DonationStatus, string> = {
  DISPONIVEL: "Disponível",
  RESERVADO: "Reservado",
  DOADO: "Doado",
};

type Props = {
  bookId: string;
  myUf?: string | null;
  myCity?: string | null;
  reloadSignal: number;
  onToast: (message: string) => void;
};

type FilterMode = "uf" | "radius" | "brazil";

const DEFAULT_RADIUS_KM = 50;

export function DonationList({ bookId, myUf, myCity, reloadSignal, onToast }: Props) {
  const [donations, setDonations] = useState<ApiDonation[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<FilterMode>(myUf ? "uf" : "brazil");
  const [uf, setUf] = useState(myUf ?? "");
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [managingId, setManagingId] = useState<string | null>(null);
  const [requestingId, setRequestingId] = useState<string | null>(null);

  function requestRadius() {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Geolocalização não disponível neste navegador.");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Nunca persistida (sessão, banco): só usada nesta busca e descartada.
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setMode("radius");
        setGeoLoading(false);
      },
      () => {
        setGeoError("Não foi possível acessar sua localização. Mostrando filtro por cidade/UF.");
        setGeoLoading(false);
      },
      { timeout: 8000 },
    );
  }

  useEffect(() => {
    if (mode === "radius" && !coords) return; // aguardando permissão/posição
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (mode === "radius" && coords) {
      params.set("lat", String(coords.lat));
      params.set("lng", String(coords.lng));
      params.set("radiusKm", String(radiusKm));
    } else if (mode === "uf" && uf) {
      params.set("uf", uf);
    }
    fetch(`/api/books/${bookId}/donations?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : { donations: [] }))
      .then((data) => !cancelled && setDonations(data.donations ?? []))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [bookId, mode, uf, coords, radiusKm, reloadSignal]);

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
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar doações por localização">
        <Chip active={mode === "uf"} onClick={() => setMode("uf")}>
          Minha cidade
        </Chip>
        <Chip active={mode === "radius"} onClick={requestRadius} disabled={geoLoading}>
          {geoLoading && <Spinner size={11} className={mode === "radius" ? "text-leather" : "text-paperMuted"} />}
          Até {radiusKm} km
        </Chip>
        <Chip active={mode === "brazil"} onClick={() => setMode("brazil")}>
          Todo o Brasil
        </Chip>
        {mode === "uf" && (
          <select
            value={uf}
            onChange={(e) => setUf(e.target.value)}
            aria-label="Filtrar por estado (UF)"
            className="min-h-tap rounded-full border border-line bg-card px-3 text-caption font-bold text-paper"
          >
            <option value="">Todos os estados</option>
            {UF_LIST.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        )}
        {mode === "uf" && myCity && uf === myUf && (
          <span className="text-caption text-paperMuted">perto de {myCity}</span>
        )}
      </div>

      {mode === "radius" && coords && (
        <div className="mt-2 flex items-center gap-2.5">
          <input
            type="range"
            min={10}
            max={500}
            step={10}
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            aria-label="Raio de busca em quilômetros"
            className="h-1.5 w-40 accent-foil"
          />
          <span className="text-xs font-bold text-paperDim">{radiusKm} km</span>
        </div>
      )}

      {geoError && <p className="mt-2 text-xs text-paperDim">{geoError}</p>}

      {!myUf && mode === "brazil" && (
        <p className="mt-2 text-xs text-paperDim">
          Defina sua cidade no perfil para ver doações perto de você.{" "}
          <Link href="/profile/edit" className="font-bold text-foil hover:opacity-80">
            Editar perfil
          </Link>
        </p>
      )}

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
                  <p className="mt-0.5 text-xs text-paperDim">
                    {STATUS_LABEL[d.status]}
                    {typeof d.distanceKm === "number" && ` · a ${Math.round(d.distanceKm)} km`}
                  </p>

                  {d.isDonor ? (
                    <Button variant="secondary" onClick={() => setManagingId(d.id)} className="mt-2">
                      Sua doação · gerenciar{d.requestCount > 0 ? ` (${d.requestCount})` : ""}
                    </Button>
                  ) : d.myRequest?.status === "ESCOLHIDO" && d.contact ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {d.contact.whatsapp && (
                        <Button variant="primary" asChild>
                          <a href={`https://wa.me/${d.contact.whatsapp}`} target="_blank" rel="noopener noreferrer">
                            WhatsApp
                          </a>
                        </Button>
                      )}
                      {d.contact.instagram && (
                        <Button variant="secondary" asChild>
                          <a
                            href={`https://instagram.com/${d.contact.instagram}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            @{d.contact.instagram}
                          </a>
                        </Button>
                      )}
                    </div>
                  ) : d.myRequest ? (
                    <p className="mt-2 text-caption font-bold text-paperMuted">Interesse enviado</p>
                  ) : d.status === "DISPONIVEL" ? (
                    <Button variant="primary" onClick={() => quero(d.id)} disabled={requestingId === d.id} className="mt-2">
                      {requestingId === d.id ? (
                        <Spinner size={12} className="text-leather" />
                      ) : (
                        <GiftIcon size={11} />
                      )}
                      Quero este
                    </Button>
                  ) : (
                    <p className="mt-2 text-caption text-paperMuted">Já reservado com outra pessoa</p>
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
