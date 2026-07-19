import type { Book } from "@/lib/types";

type BookCoverProps = {
  book: Pick<Book, "title" | "gradient">;
  /** Largura em px; a altura segue a proporção 2:3 de uma capa. */
  width: number;
  className?: string;
};

/**
 * Capa mocada: gradiente de duas cores, "lombada" escura de 4px à esquerda
 * e título em Fraunces sobreposto no rodapé.
 */
export function BookCover({ book, width, className = "" }: BookCoverProps) {
  const height = Math.round(width * 1.5);
  const fontSize = Math.max(9, Math.round(width * 0.115));
  const [from, to] = book.gradient;

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
