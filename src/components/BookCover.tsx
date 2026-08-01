"use client";

import { useState } from "react";
import Image from "next/image";
import type { Book } from "@/lib/types";

type BookCoverProps = {
  book: Pick<Book, "title" | "gradient" | "coverUrl">;
  /** Largura em px; a altura segue a proporção 2:3 de uma capa. Ignorado
   * quando `fluid` é usado. */
  width?: number;
  /** Ocupa 100% do container em vez de um tamanho fixo — pra grids
   * responsivas (ex.: grade da Estante, favoritos do Perfil) que estourariam
   * em telas estreitas com uma largura fixa em px. */
  fluid?: boolean;
  className?: string;
  /** Só a capa do maior card acima da dobra (leitura atual na home) deve
   * usar isso — sinaliza ao next/image que é a LCP e pula o lazy-load. */
  priority?: boolean;
  /** `sizes` do next/image quando `fluid` — ajuste conforme o layout da
   * grid pra evitar baixar uma imagem maior que o necessário. */
  sizes?: string;
};

function Placeholder({ book, fontSize }: { book: BookCoverProps["book"]; fontSize: number }) {
  return (
    <div aria-hidden="true" className="h-full w-full">
      <span className="absolute inset-y-0 left-0 w-1 bg-black/40" />
      <span
        className="absolute inset-x-0 bottom-0 px-1.5 pb-1.5 pl-2.5 font-display font-bold leading-tight text-white/90 [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]"
        style={{ fontSize }}
      >
        {book.title}
      </span>
    </div>
  );
}

/**
 * Capa do livro: usa a imagem real (Google Books) quando disponível: senão
 * cai no gradiente mocado de duas cores com o título sobreposto no rodapé.
 */
export function BookCover({
  book,
  width,
  fluid = false,
  className = "",
  priority = false,
  sizes,
}: BookCoverProps) {
  const [from, to] = book.gradient;
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = Boolean(book.coverUrl) && !imgFailed;

  if (fluid) {
    return (
      <div
        className={`relative aspect-[2/3] w-full shrink-0 overflow-hidden rounded-md shadow-md shadow-black/40 ${className}`}
        style={{ backgroundImage: `linear-gradient(155deg, ${from} 0%, ${to} 100%)` }}
      >
        {showImage ? (
          <Image
            src={book.coverUrl!}
            alt={book.title}
            fill
            sizes={sizes ?? "(min-width: 1024px) 12vw, (min-width: 768px) 16vw, 25vw"}
            priority={priority}
            loading={priority ? undefined : "lazy"}
            className="object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <Placeholder book={book} fontSize={13} />
        )}
      </div>
    );
  }

  const w = width ?? 48;
  const height = Math.round(w * 1.5);
  const fontSize = Math.max(9, Math.round(w * 0.115));

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-md shadow-md shadow-black/40 ${className}`}
      style={{
        width: w,
        height,
        backgroundImage: `linear-gradient(155deg, ${from} 0%, ${to} 100%)`,
      }}
    >
      {showImage ? (
        <Image
          src={book.coverUrl!}
          alt={book.title}
          width={w}
          height={height}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <Placeholder book={book} fontSize={fontSize} />
      )}
    </div>
  );
}
