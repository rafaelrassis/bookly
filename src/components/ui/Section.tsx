import type { HTMLAttributes, ReactNode } from "react";

type SectionProps = HTMLAttributes<HTMLElement> & {
  title?: ReactNode;
  action?: ReactNode;
};

/** Ritmo vertical único entre seções (fim do mt-4/mt-5/mt-6/mt-7 ad-hoc) e
 * cabeçalho padrão de seção (substitui `SectionTitle` solto + div wrapper). */
export function Section({ title, action, children, className = "", ...rest }: SectionProps) {
  return (
    <section className={`mt-8 first:mt-4 ${className}`} {...rest}>
      {(title || action) && (
        <div className="mb-3 flex min-h-tap items-center justify-between gap-3">
          {title && <h2 className="text-meta uppercase text-paperMuted">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
