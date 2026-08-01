import type { ButtonHTMLAttributes } from "react";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Obrigatório: o botão só tem ícone, então precisa de nome acessível. */
  label: string;
};

/** Botão só-ícone com alvo de toque real de 44px — substitui caracteres de
 * texto usados como botão (ex.: "⋯" na Estante) sem afordância nem alvo. */
export function IconButton({ label, className = "", children, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`flex min-h-tap min-w-tap shrink-0 items-center justify-center rounded-full
                  text-paperMuted transition-colors hover:bg-card2 hover:text-paper ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
