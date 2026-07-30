import type { FeedEventType, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

type DbClient = typeof db | Prisma.TransactionClient;

/** Grava 1 FeedEvent no ponto de criação do registro original (review,
 * conclusão de leitura, doação, entrada em clube, citação) — feed unificado
 * lê só desta tabela, nunca faz union das 5 tabelas de origem em tempo de
 * leitura (ver spec do stream unificado). */
export async function recordFeedEvent(
  tx: DbClient,
  params: {
    userId: string;
    type: FeedEventType;
    bookId?: string;
    reviewId?: string;
    donationId?: string;
    clubId?: string;
    highlightId?: string;
  }
) {
  await tx.feedEvent.create({ data: params });
}
