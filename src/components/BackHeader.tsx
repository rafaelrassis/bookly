"use client";

import { useRouter } from "next/navigation";

/** Header com botão voltar (‹) usado em /search, /book/[id] e /clubs/[id]. */
export function BackHeader({ children }: { children?: React.ReactNode }) {
  const router = useRouter();
  return (
    <header className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Voltar"
        className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-2xl text-paperDim hover:text-paper"
      >
        ‹
      </button>
      {children}
    </header>
  );
}
