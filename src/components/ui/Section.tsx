import type { HTMLAttributes, ReactNode } from "react";

type SectionProps = HTMLAttributes<HTMLElement> & {
  title?: ReactNode;
  action?: ReactNode;
  /** Fixa o cabeçalho (título + action) no topo ao rolar — usado quando a
   * ação (ex.: toggle de filtro) precisa ficar acessível durante a leitura. */
  stickyHeader?: boolean;
};

/** Ritmo vertical único entre seções (fim do mt-4/mt-5/mt-6/mt-7 ad-hoc) e
 * cabeçalho padrão de seção (substitui `SectionTitle` solto + div wrapper). */
export function Section({
  title,
  action,
  stickyHeader = false,
  children,
  className = "",
  ...rest
}: SectionProps) {
  return (
    <section className={`mt-8 first:mt-4 ${className}`} {...rest}>
      {(title || action) && (
        <div
          className={`mb-3 flex min-h-tap items-center justify-between gap-3 ${
            stickyHeader
              ? "sticky top-0 z-10 -mx-5 bg-leather/95 px-5 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
              : ""
          }`}
        >
          {title && <h2 className="text-meta uppercase text-paperMuted">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
