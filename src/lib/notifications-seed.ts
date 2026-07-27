import type { Notification } from "@/lib/types";

/** Notificações mocadas: atividade de leitores da comunidade semeada sobre o
 * usuário logado. Notificações ainda não têm backend (sem model no Prisma) —
 * ficam só no store local, sincronizadas por sessão. */
export const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    kind: "like",
    actor: "@ana.estante",
    reviewId: "me-1984",
    bookId: "1984",
    time: "2026-07-20T18:10:00Z",
  },
  {
    id: "n2",
    kind: "comment",
    actor: "@caio_reads",
    reviewId: "me-1984",
    bookId: "1984",
    text: "Concordo demais com o final!",
    time: "2026-07-20T19:02:00Z",
  },
  {
    id: "n3",
    kind: "follow",
    actor: "@rafa.books",
    time: "2026-07-19T08:30:00Z",
  },
];
