import { RESERVE_EXPIRY_DAYS } from "@/lib/donation-config";
import type { DonationRequestStatus, DonationStatus, NotificationType } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;

export type DonationViewerRole = "donor" | "receiver" | "requester";

/** "Sua vez" (um botão primário) ou "Aguardando" (uma frase, sem botão) —
 * a regra que organiza toda a tela de negociação e os cards do painel.
 * "concluida" é um terceiro estado de exibição (doação já encerrada do
 * ponto de vista de quem olha), sem ação nem espera. */
export type DonationTurnState = "sua-vez" | "aguardando" | "concluida";

export type DonationTurnAction = "escolher" | "confirmar-entrega" | "confirmar-recebimento";

export type DonationTurn =
  | { state: "sua-vez"; action: DonationTurnAction; sentence: string; deadline: Date | null }
  | { state: "aguardando"; sentence: string; deadline: Date | null }
  | { state: "concluida"; sentence: string };

export type DonationTurnInput = {
  status: DonationStatus;
  role: DonationViewerRole;
  /** Nome de quem está do outro lado — o interessado escolhido pro doador,
   * o doador pro recebedor/interessado. Null quando ainda não há alguém
   * (ex.: doador sem ninguém escolhido ainda). */
  counterpartName: string | null;
  /** Só relevante pro doador com status DISPONIVEL — fila de interessados. */
  pendingCount: number;
  receiverConfirmedAt: string | Date | null;
  reservedAt: string | Date | null;
};

const ACTION_LABEL: Record<DonationTurnAction, string> = {
  escolher: "Escolher quem recebe",
  "confirmar-entrega": "Confirmar entrega",
  "confirmar-recebimento": "Confirmar recebimento",
};

/** Rótulo do botão primário de uma ação de "sua vez" — mesmo texto no card
 * do painel e no bloco "Sua vez" da negociação. */
export function donationActionLabel(action: DonationTurnAction): string {
  return ACTION_LABEL[action];
}

export function turnChipLabel(state: DonationTurnState): "Sua vez" | "Aguardando" | "Concluída" {
  if (state === "sua-vez") return "Sua vez";
  if (state === "aguardando") return "Aguardando";
  return "Concluída";
}

/** Prazo da reserva: RESERVE_EXPIRY_DAYS depois de `reservedAt` — mesma
 * janela usada por processReserveExpiry (lib/donation-expiry.ts). */
export function reserveDeadline(reservedAt: string | Date): Date {
  const d = typeof reservedAt === "string" ? new Date(reservedAt) : reservedAt;
  return new Date(d.getTime() + RESERVE_EXPIRY_DAYS * DAY_MS);
}

/** "Prazo: faltam N dias" / "Prazo: falta 1 dia" / "Prazo vencido" — usado
 * junto do rótulo "Sua vez"/"Aguardando" sempre que há uma reserva em jogo. */
export function formatDeadlinePhrase(deadline: Date, now: Date = new Date()): string {
  const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / DAY_MS);
  if (diffDays <= 0) return "Prazo vencido";
  if (diffDays === 1) return "Prazo: falta 1 dia";
  return `Prazo: faltam ${diffDays} dias`;
}

/**
 * A regra que organiza tudo: toda doação está sempre em um de dois estados
 * do ponto de vista de quem olha — "Sua vez" (um botão primário) ou
 * "Aguardando o outro lado" (uma frase, sem botão). Avaliada por viewer, não
 * globalmente — nada impede que doador e recebedor estejam simultaneamente
 * em "Sua vez" olhando a mesma doação (cada um tem uma ação independente
 * disponível: o doador pode confirmar a entrega, o recebedor pode confirmar
 * o recebimento, a qualquer momento depois da reserva).
 */
export function getDonationTurn(input: DonationTurnInput): DonationTurn {
  const deadline = input.reservedAt ? reserveDeadline(input.reservedAt) : null;

  if (input.role === "donor") {
    if (input.status === "DISPONIVEL") {
      if (input.pendingCount > 0) {
        return {
          state: "sua-vez",
          action: "escolher",
          sentence:
            input.pendingCount === 1
              ? "1 pessoa quer este livro — escolha quem recebe."
              : `${input.pendingCount} pessoas querem este livro — escolha quem recebe.`,
          deadline: null,
        };
      }
      return {
        state: "aguardando",
        sentence: "Aguardando alguém se interessar por este livro.",
        deadline: null,
      };
    }

    if (input.status === "RESERVADO") {
      return {
        state: "sua-vez",
        action: "confirmar-entrega",
        sentence: input.counterpartName
          ? `Reservado para ${input.counterpartName}. Confirme quando entregar o livro.`
          : "Reservado. Confirme quando entregar o livro.",
        deadline,
      };
    }

    return {
      state: "concluida",
      sentence: input.receiverConfirmedAt
        ? "Doação concluída — recebimento confirmado."
        : "Doação concluída — aguardando confirmação de recebimento.",
    };
  }

  if (input.role === "receiver") {
    if (!input.receiverConfirmedAt) {
      return {
        state: "sua-vez",
        action: "confirmar-recebimento",
        sentence: input.counterpartName
          ? `Você foi escolhido por ${input.counterpartName}. Confirme quando receber o livro.`
          : "Você foi escolhido. Confirme quando receber o livro.",
        deadline: input.status === "RESERVADO" ? deadline : null,
      };
    }
    return { state: "concluida", sentence: "Você confirmou o recebimento." };
  }

  // requester: pedido ainda PENDENTE, nunca foi escolhido — só espera.
  if (input.status === "DISPONIVEL") {
    return {
      state: "aguardando",
      sentence: "Aguardando o doador escolher entre os interessados.",
      deadline: null,
    };
  }
  if (input.status === "RESERVADO") {
    return {
      state: "aguardando",
      sentence: "Reservado com outra pessoa. Se não der certo, seu pedido continua na fila.",
      deadline: null,
    };
  }
  return { state: "concluida", sentence: "Este exemplar já foi doado para outra pessoa." };
}

export type DonationTimelineActor = {
  id: string;
  username: string | null;
  name: string;
  avatar: number;
  avatarUrl: string | null;
};

export type DonationTimelineNotification = {
  type: NotificationType;
  actor: DonationTimelineActor | null;
  createdAt: string | Date;
};

export type DonationTimelineEntry = {
  key: string;
  type: NotificationType | "ANUNCIADA";
  actor: DonationTimelineActor | null;
  createdAt: string;
  sentence: string;
};

const TIMELINE_SENTENCE: Record<NotificationType, (actorName: string | null) => string> = {
  DONATION_REQUEST_RECEIVED: (n) => `${n ?? "Alguém"} demonstrou interesse no livro.`,
  DONATION_CHOSEN: (n) => `${n ?? "O doador"} escolheu quem recebe o livro.`,
  DONATION_COMPLETED: (n) => `${n ?? "O doador"} marcou o livro como entregue.`,
  DONATION_RECEIPT_CONFIRMED: (n) => `${n ?? "O recebedor"} confirmou o recebimento.`,
  DONATION_RESERVE_EXTENDED: (n) => `${n ?? "O doador"} estendeu o prazo em 7 dias.`,
  DONATION_RESERVE_EXPIRING: () => "O prazo da reserva está prestes a vencer.",
  DONATION_RESERVE_EXPIRED: () => "A reserva expirou — o livro voltou a ficar disponível.",
};

function toISO(value: string | Date): string {
  return typeof value === "string" ? value : value.toISOString();
}

/** "há N minutos"-agnóstico: só arredonda pro minuto, o bastante pra
 * agrupar as duas notificações (doador + recebedor) que o cron de
 * expiração grava pro mesmo evento, sem depender de milissegundo exato. */
function minuteBucket(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Date(Math.floor(d.getTime() / 60_000) * 60_000).toISOString();
}

/**
 * Linha do tempo de uma doação: quem fez o quê e quando, do mais recente ao
 * anúncio original. Fonte de dados é só `Notification` (ver lib/notify) +
 * `createdAt` da própria doação como o primeiro evento ("anunciada") — sem
 * tabela nova. As notificações de expiração de reserva são gravadas uma vez
 * pro doador e uma vez pro recebedor (mesmo evento, dois destinatários);
 * aqui elas colapsam numa única entrada.
 */
export function buildDonationTimeline(params: {
  donationCreatedAt: string | Date;
  donor: DonationTimelineActor;
  notifications: DonationTimelineNotification[];
}): DonationTimelineEntry[] {
  const entries: DonationTimelineEntry[] = [
    {
      key: "anunciada",
      type: "ANUNCIADA",
      actor: params.donor,
      createdAt: toISO(params.donationCreatedAt),
      sentence: `${params.donor.name} anunciou esta doação.`,
    },
  ];

  const seenSystemEvents = new Set<string>();
  for (const n of params.notifications) {
    if (
      (n.type === "DONATION_RESERVE_EXPIRING" || n.type === "DONATION_RESERVE_EXPIRED") &&
      n.actor === null
    ) {
      const dedupeKey = `${n.type}:${minuteBucket(n.createdAt)}`;
      if (seenSystemEvents.has(dedupeKey)) continue;
      seenSystemEvents.add(dedupeKey);
    }

    entries.push({
      key: `${n.type}-${toISO(n.createdAt)}-${entries.length}`,
      type: n.type,
      actor: n.actor,
      createdAt: toISO(n.createdAt),
      sentence: TIMELINE_SENTENCE[n.type](n.actor?.name ?? null),
    });
  }

  return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export type { DonationRequestStatus };
