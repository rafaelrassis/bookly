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
