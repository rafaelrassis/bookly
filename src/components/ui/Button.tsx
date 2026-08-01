import { cloneElement, isValidElement, type ButtonHTMLAttributes, type ReactElement } from "react";

const BASE =
  "inline-flex min-h-tap items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold " +
  "transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTS = {
  primary: "bg-foil text-leather hover:opacity-90",
  secondary: "border border-line bg-card text-paper hover:bg-card2",
  ghost: "text-paperMuted hover:bg-card2 hover:text-paper",
  danger: "bg-ribbon text-ribbonText hover:opacity-90",
  /** Ação destrutiva sem fundo — legível, mas nunca confundível com a ação
   * principal (Proposta 3: "Cancelar reserva" no rodapé da negociação). */
  dangerGhost: "text-ribbonText hover:bg-ribbon/10",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  full?: boolean;
  /** Aplica o visual do botão a um único filho (ex.: `Link`) em vez de
   * renderizar um `<button>` — pra CTAs que navegam via `href`. */
  asChild?: boolean;
};

/** Botão base do app: sempre 44px de alvo de toque, quatro variantes de
 * ênfase. Substitui os botões inline (`rounded-xl border ... px-4 py-2.5`
 * etc.) repetidos em Home, Estante, Clubes e Busca. */
export function Button({
  variant = "secondary",
  full = false,
  asChild = false,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const classes = `${BASE} ${VARIANTS[variant]} ${full ? "w-full" : ""} ${className}`;

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string }>;
    return cloneElement(child, {
      className: `${classes} ${child.props.className ?? ""}`,
    });
  }

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}
