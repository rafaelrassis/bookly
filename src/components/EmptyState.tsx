import Link from "next/link";
import type { ReactNode } from "react";

type Action = { label: string; href: string } | { label: string; onClick: () => void };

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: Action;
  /** Conteúdo extra abaixo da ação principal (ex.: um segundo link/CTA). */
  children?: ReactNode;
  className?: string;
};

/** Estado vazio reutilizável: ícone opcional + título + descrição + CTA. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  children,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center gap-1.5 py-10 text-center ${className}`}>
      {icon && (
        <div aria-hidden="true" className="mb-2 text-paperMuted">
          {icon}
        </div>
      )}
      <p className="font-bold">{title}</p>
      {description && <p className="max-w-64 text-sm text-paperDim">{description}</p>}
      {action &&
        ("href" in action ? (
          <Link
            href={action.href}
            className="mt-4 rounded-xl bg-foil px-5 py-3 text-sm font-bold text-leather transition-opacity hover:opacity-90"
          >
            {action.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-4 rounded-xl bg-foil px-5 py-3 text-sm font-bold text-leather transition-opacity hover:opacity-90"
          >
            {action.label}
          </button>
        ))}
      {children}
    </div>
  );
}
