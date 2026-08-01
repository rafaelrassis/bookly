import type { NotificationType, Prisma } from "@/generated/prisma/client";

/** Tipos onde múltiplas pessoas podem gerar notificações pro mesmo alvo (ex.:
 * 3 pessoas pedindo a mesma doação) — os demais tipos são eventos 1:1 por
 * doação (escolhido, concluído, extensão de reserva etc.) e não ganham nada
 * sendo agrupados. */
export const GROUPABLE_NOTIFICATION_TYPES: NotificationType[] = ["DONATION_REQUEST_RECEIVED"];

export type NotificationWithRelations = Prisma.NotificationGetPayload<{
  include: {
    actor: { select: { id: true; username: true; name: true; avatar: true; avatarUrl: true } };
    donation: { select: { id: true; bookId: true; book: { select: { title: true } } } };
  };
}>;

export type NotificationGroup = {
  key: string;
  type: NotificationType;
  donationId: string | null;
  read: boolean;
  createdAt: Date;
  actors: NonNullable<NotificationWithRelations["actor"]>[];
  donation: NotificationWithRelations["donation"];
};

/** Agrupa notificações não lidas do mesmo tipo + mesma doação em tempo de
 * leitura (não na escrita — ver spec). `items` deve vir ordenado por
 * `createdAt desc`; notificações lidas ou de tipos fora da whitelist ficam
 * sempre em grupos de 1 item. */
export function groupNotifications(items: NotificationWithRelations[]): NotificationGroup[] {
  const groups = new Map<string, NotificationGroup>();
  const order: NotificationGroup[] = [];

  for (const n of items) {
    const groupable = !n.read && GROUPABLE_NOTIFICATION_TYPES.includes(n.type);
    const key = groupable ? `${n.type}:${n.donationId ?? "none"}` : `single:${n.id}`;

    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        type: n.type,
        donationId: n.donationId,
        read: n.read,
        createdAt: n.createdAt,
        actors: [],
        donation: n.donation,
      };
      groups.set(key, group);
      order.push(group);
    }

    if (n.actor && !group.actors.some((a) => a.id === n.actor!.id)) group.actors.push(n.actor);
  }

  return order;
}
