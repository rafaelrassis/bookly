"use client";

type RatingInputProps = {
  /** Nota atual (0 = sem nota). */
  rating: number;
  onChange: (rating: number) => void;
};

/**
 * Avaliação interativa: toque = nota cheia; segundo toque na mesma estrela
 * = meia estrela (4 vira 3,5); toque com a meia ativa remove a nota.
 */
export function RatingInput({ rating, onChange }: RatingInputProps) {
  function handleTap(star: number) {
    if (rating === star) {
      onChange(star - 0.5);
    } else if (rating === star - 0.5) {
      onChange(0);
    } else {
      onChange(star);
    }
  }

  return (
    <div>
      <div className="flex gap-1" role="group" aria-label="Sua avaliação">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFull = rating >= star;
          const isHalf = rating === star - 0.5;
          return (
            <button
              key={star}
              type="button"
              onClick={() => handleTap(star)}
              aria-label={`${star} ${star === 1 ? "estrela" : "estrelas"}`}
              aria-pressed={isFull || isHalf}
              className="relative flex min-h-tap min-w-tap items-center justify-center rounded-lg text-4xl leading-none transition-transform active:scale-90"
            >
              <span className={isFull ? "text-foil" : "text-paperMuted"}>★</span>
              {isHalf && (
                <span
                  className="absolute inset-0 w-1/2 overflow-hidden p-0.5 text-foil"
                  aria-hidden="true"
                >
                  ★
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-paperMuted">
        Toque para dar a nota. Toque de novo na mesma estrela para meia estrela; mais um toque
        remove a nota.
      </p>
    </div>
  );
}
