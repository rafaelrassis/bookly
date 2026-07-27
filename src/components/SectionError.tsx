"use client";

type Props = {
  message?: string;
  onRetry: () => void;
};

/** Erro de seção/rota: usado pelos error.tsx aninhados (mantém TopNav/TabBar
 * visíveis — só o conteúdo da rota vira essa mensagem). */
export function SectionError({
  message = "Não foi possível carregar esta página. Tente de novo em instantes.",
  onRetry,
}: Props) {
  return (
    <div className="mt-12 flex flex-col items-center gap-3 px-5 text-center">
      <p className="text-paperDim">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-bold text-paper transition-colors hover:border-foil/50"
      >
        Tentar de novo
      </button>
    </div>
  );
}
