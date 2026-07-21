import type { Notification } from "@/lib/types";

/** Notificações mocadas: atividade de leitores mock sobre o usuário logado. */
export const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    kind: "like",
    actor: "@ana.estante",
    reviewId: "me-1984",
    bookId: "1984",
    read: false,
    time: "2026-07-20T18:10:00",
  },
  {
    id: "n2",
    kind: "comment",
    actor: "@caio_reads",
    reviewId: "me-1984",
    bookId: "1984",
    text: "Concordo demais com o final!",
    read: false,
    time: "2026-07-20T19:02:00",
  },
  {
    id: "n3",
    kind: "follow",
    actor: "@rafa.books",
    read: true,
    time: "2026-07-19T08:30:00",
  },
];
