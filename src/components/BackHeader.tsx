"use client";

import { useRouter } from "next/navigation";

/** Header com botão voltar usado em /search, /book/[id] e /clubs/[id]. */
export function BackHeader({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  return (
    <header className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Voltar"
        className="-ml-2 flex min-h-tap min-w-tap shrink-0 items-center justify-center rounded-full text-paperMuted hover:text-paper"
      >
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
      {children}
    </header>
  );
}
