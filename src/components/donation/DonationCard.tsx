import Image from "next/image";
import Link from "next/link";
import { donationActionLabel, formatDeadlinePhrase, turnChipLabel, type DonationTurn } from "@/lib/donation-state";

type DonationCardProps = {
  href: string;
  photoUrl: string;
  title: string;
  city: string;
  uf: string;
  /** "Você doa" ou "Você recebe" — de que lado o viewer está nesta doação. */
  role: "donor" | "receiver";
  /** Nome de quem está do outro lado, quando já há alguém (interessado
   * escolhido pro doador; doador pro recebedor). */
  counterpartName: string | null;
  turn: DonationTurn;
};

/**
 * Card de estado reutilizável — base do painel `/profile/doacoes` (e,
 * ampliado, do bloco "Sua vez" da negociação). Faixa de estado ("Sua vez"
 * em foil, "Aguardando"/"Concluída" em paperMuted), capa, título, direção
 * ("Você doa · para João Vieira"), frase do próximo passo com prazo, e o
 * botão primário só quando é a vez do viewer. O cartão inteiro é o alvo de
 * toque — o "botão" é só o rótulo visual, o link é que navega.
 */
export function DonationCard({ href, photoUrl, title, city, uf, role, counterpartName, turn }: DonationCardProps) {
  const direction =
    role === "donor"
      ? counterpartName
        ? `Você doa · para ${counterpartName}`
        : "Você doa"
      : counterpartName
        ? `Você recebe · de ${counterpartName}`
        : "Você recebe";

  const isMyTurn = turn.state === "sua-vez";
  const deadline = turn.state !== "concluida" ? turn.deadline : null;

  return (
    <li>
      <Link
        href={href}
        className="block overflow-hidden rounded-2xl border border-line bg-card transition-colors hover:bg-card2"
      >
        <div
          className={`px-3.5 py-1.5 text-meta uppercase ${
            isMyTurn ? "bg-foil text-leather" : "bg-card2 text-paperMuted"
          }`}
        >
          {turnChipLabel(turn.state)}
        </div>
        <div className="flex gap-3 p-3.5">
          <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-card2">
            <Image src={photoUrl} alt="" fill sizes="64px" className="object-cover" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-bold">{title}</p>
            <p className="mt-0.5 truncate text-xs text-paperMuted">
              {direction} · {city}, {uf}
            </p>
            <p className="mt-1.5 text-caption text-paper">{turn.sentence}</p>
            {deadline && <p className="mt-0.5 text-caption text-paperMuted">{formatDeadlinePhrase(deadline)}</p>}
            {isMyTurn && turn.state === "sua-vez" && (
              <span className="mt-2 inline-flex min-h-tap items-center justify-center rounded-xl bg-foil px-4 text-sm font-bold text-leather">
                {donationActionLabel(turn.action)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}
