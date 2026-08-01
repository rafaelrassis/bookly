export type TrustTier = { key: string; label: string; min: number };

const TIERS: TrustTier[] = [
  { key: "confiavel", label: "Doador confiável", min: 3 },
  { key: "veterano", label: "Doador veterano", min: 10 },
  { key: "referencia", label: "Referência da comunidade", min: 25 },
];

/** Retorna o tier mais alto atingido, ou null se ainda não alcançou o primeiro. */
export function trustTier(confirmedCount: number): TrustTier | null {
  let current: TrustTier | null = null;
  for (const t of TIERS) if (confirmedCount >= t.min) current = t;
  return current;
}

/** Limiares menores que os do doador (3/10 vs 3/10/25): doar um livro
 * fisicamente é uma barreira maior que pedir e confirmar recebimento. Sem
 * terceiro tier — não há base pra saber se 25 recebimentos equivale a 25
 * doações. */
const RECEIVER_TIERS: TrustTier[] = [
  { key: "receptivo", label: "Recebedor engajado", min: 3 },
  { key: "recorrente", label: "Recebedor recorrente", min: 10 },
];

export function receiverTier(receivedConfirmedCount: number): TrustTier | null {
  let current: TrustTier | null = null;
  for (const t of RECEIVER_TIERS) if (receivedConfirmedCount >= t.min) current = t;
  return current;
}
