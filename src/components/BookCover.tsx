"use client";

import { useState } from "react";
import type { Book } from "@/lib/types";

type BookCoverProps = {
  book: Pick<Book, "title" | "gradient" | "coverUrl">;
  /** Largura em px; a altura segue a proporção 2:3 de uma capa. */
  width: number;
  className?: string;
};

/**
 * Capa do livro: usa a imagem real (Google Books) quando disponível: senão
 * cai no gradiente mocado de duas cores com o título sobreposto no rodapé.
 */
export function BookCover({ book, width, className = "" }: BookCoverProps) {
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
      aria-hidden="true"
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={book.coverUrl}
          alt=""
          loading="lazy"
          width={width}
          height={height}
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <>
          <span className="absolute inset-y-0 left-0 w-1 bg-black/40" />
          <span
            className="absolute inset-x-0 bottom-0 px-1.5 pb-1.5 pl-2.5 font-display font-bold leading-tight text-white/90 [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]"
            style={{ fontSize }}
          >
            {book.title}
          </span>
        </>
      )}
    </div>
  );
}
