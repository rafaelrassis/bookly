import type { ButtonHTMLAttributes } from "react";

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active: boolean;
};

/** Chip de filtro/toggle: 44px de altura mesmo com texto pequeno (antes
 * ~28px em shelf/profile/home). Usa `aria-pressed` — quem precisar de
 * `role="tab"` passa `role`/`aria-selected` via props e ignora `aria-pressed`. */
export function Chip({ active, className = "", children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={props.role === "tab" ? undefined : active}
      className={`inline-flex min-h-tap shrink-0 items-center rounded-full px-4 text-caption
                  font-bold transition-colors ${
                    active
                      ? "bg-foil text-leather"
                      : "border border-line bg-card text-paperMuted hover:text-paper"
                  } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
