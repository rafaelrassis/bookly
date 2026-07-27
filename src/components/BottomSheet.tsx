"use client";

import { useModalA11y } from "@/lib/useModalA11y";

type Props = {
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

export function BottomSheet({ onClose, title, children }: Props) {
  const dialogRef = useModalA11y<HTMLDivElement>(onClose);

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- fechar no clique fora é um atalho de mouse; teclado já fecha com Esc (useModalA11y)
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="w-full max-w-app rounded-t-3xl border-t border-line bg-card p-5 pb-8 focus:outline-none"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" aria-hidden />
        {title && <h2 className="mb-3 text-lg font-bold">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
