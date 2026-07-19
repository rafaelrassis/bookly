import { formatDecimal } from "@/lib/format";

type StarsProps = {
  rating: number;
  className?: string;
  /** Mostra as estrelas "vazias" restantes esmaecidas. */
  showEmpty?: boolean;
};

/**
 * Estrelas de exibição: nota 3.5 renderiza "★★★½".
 * A nota é arredondada para o 0,5 mais próximo.
 */
export function Stars({ rating, className = "", showEmpty = false }: StarsProps) {
  const rounded = Math.round(rating * 2) / 2;
  const full = Math.floor(rounded);
  const hasHalf = rounded - full === 0.5;
  const empty = 5 - full - (hasHalf ? 1 : 0);

  return (
    <span
      className={`text-foil ${className}`}
      role="img"
      aria-label={`Nota ${formatDecimal(rating)} de 5`}
    >
      {"★".repeat(full)}
      {hasHalf && "½"}
      {showEmpty && empty > 0 && <span className="text-paperDim/40">{"★".repeat(empty)}</span>}
    </span>
  );
}
