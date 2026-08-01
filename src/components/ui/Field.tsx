import { cloneElement, type ReactElement } from "react";

type FieldChildProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  id: string;
  children: ReactElement<FieldChildProps>;
};

/** Rótulo + erro + dica com a11y ligada (htmlFor/aria-describedby/
 * aria-invalid) — todo formulário do app escrevia isso à mão, ou não
 * escrevia. Aceita um único filho controlável (input/textarea/select). */
export function Field({ label, hint, error, id, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-meta uppercase text-paperMuted">
        {label}
      </label>
      {cloneElement(children, {
        id,
        "aria-describedby": [hintId, errorId].filter(Boolean).join(" ") || undefined,
        "aria-invalid": error ? true : undefined,
      })}
      {hint && (
        <p id={hintId} className="text-caption text-paperMuted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-caption text-ribbonText">
          {error}
        </p>
      )}
    </div>
  );
}
