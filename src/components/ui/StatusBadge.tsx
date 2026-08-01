import type { ReactNode } from "react";

const TONE = {
  neutral: "bg-card2 text-paperMuted",
  positive: "bg-foil/15 text-foil",
  warning: "bg-ribbon/20 text-ribbonText",
  danger: "bg-ribbon/15 text-ribbon",
} as const;

type StatusBadgeProps = {
  tone?: keyof typeof TONE;
  children: ReactNode;
  className?: string;
};

/** Badge de status única — substitui os `text-[10px]/[11px] font-bold`
 * escritos à mão nos painéis de doação. */
export function StatusBadge({ tone = "neutral", children, className = "" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-meta ${TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
