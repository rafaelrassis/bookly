"use client";

import { useId } from "react";
import { useModalA11y } from "@/lib/useModalA11y";

type SheetProps = {
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

/** Modal com duas apresentações: folha subindo do rodapé no mobile, diálogo
 * centralizado no desktop. Base de todo modal do app (`FeedbackModal`,
 * gerenciar doação, meta de leitura, tags...) — evita reescrever largura,
 * posicionamento e a11y de modal em cada tela. */
export function Sheet({ onClose, title, children }: SheetProps) {
  const dialogRef = useModalA11y<HTMLDivElement>(onClose);
  const titleId = useId();

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- fechar no clique fora é um atalho de mouse; teclado já fecha com Esc (useModalA11y)
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center md:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : "Diálogo"}
        tabIndex={-1}
        className="max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl border-t border-line bg-card
                   p-5 pb-[calc(2rem+env(safe-area-inset-bottom))] focus:outline-none
                   md:max-w-lg md:rounded-3xl md:border md:pb-5 md:shadow-2xl md:shadow-black/50"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line md:hidden" aria-hidden="true" />
        {title && (
          <h2 id={titleId} className="mb-3 text-title font-bold">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
