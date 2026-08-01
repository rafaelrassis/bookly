import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

/** Campo de texto base do app — substitui o
 * `rounded-xl border border-line bg-card px-4 py-3 text-base text-paper`
 * repetido em login, signup, onboarding, recuperar senha, editar perfil e
 * novo clube. */
export function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      {...props}
      className={`min-h-tap w-full rounded-xl border border-line bg-card px-4 text-base text-paper focus:border-foil/60 ${className}`}
    />
  );
}
