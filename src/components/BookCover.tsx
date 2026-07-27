"use client";

import { useState } from "react";
import Image from "next/image";
import type { Book } from "@/lib/types";

type BookCoverProps = {
  book: Pick<Book, "title" | "gradient" | "coverUrl">;
  /** Largura em px; a altura segue a proporção 2:3 de uma capa. */
  width: number;
  className?: string;
  /** Só a capa do maior card acima da dobra (leitura atual na home) deve
   * usar isso — sinaliza ao next/image que é a LCP e pula o lazy-load. */
  priority?: boolean;
};

/**
 * Capa do livro: usa a imagem real (Google Books) quando disponível: senão
 * cai no gradiente mocado de duas cores com o título sobreposto no rodapé.
 */
export function BookCover({ book, width, className = "", priority = false }: BookCoverProps) {
  const height = Math.round(width * 1.5);
  const fontSize = Math.max(9, Math.round(width * 0.115));
  const [from, to] = book.gradient;
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = Boolean(book.coverUrl) && !imgFailed;

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-md shadow-md shadow-black/40 ${className}`}
      style={{
        width,
        height,
        backgroundImage: `linear-gradient(155deg, ${from} 0%, ${to} 100%)`,
      }}
    >
      {showImage ? (
        <Image
          src={book.coverUrl!}
          alt={book.title}
          width={width}
          height={height}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div aria-hidden="true" className="h-full w-full">
          <span className="absolute inset-y-0 left-0 w-1 bg-black/40" />
          <span
            className="absolute inset-x-0 bottom-0 px-1.5 pb-1.5 pl-2.5 font-display font-bold leading-tight text-white/90 [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]"
            style={{ fontSize }}
          >
            {book.title}
          </span>
        </div>
      )}
    </div>
  );
}
