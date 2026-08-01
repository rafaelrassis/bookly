import { Spinner } from "@/components/Spinner";
import { formatShortDate } from "@/lib/format";
import type { ShelfEntry, ShelfStatus } from "@/lib/types";

const STATUS_OPTIONS: { status: ShelfStatus; label: string }[] = [
  { status: "WANT_TO_READ", label: "Quero ler" },
  { status: "READING", label: "Lendo" },
  { status: "READ", label: "Lido" },
  { status: "DNF", label: "Abandonei" },
];

type Props = {
  entry: ShelfEntry | null;
  readingHistory: string[];
  rereading: boolean;
  onStatusTap: (status: ShelfStatus) => void;
  onReread: () => void;
};

/** Botões de status da estante — a ação mais usada da tela do livro. */
export function StatusSection({ entry, readingHistory, rereading, onStatusTap, onReread }: Props) {
  return (
    <section className="mt-6" aria-label="Status de leitura">
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map(({ status, label }) => {
          const active = entry?.status === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() => onStatusTap(status)}
              aria-pressed={active}
              className={`min-h-tap min-w-[calc(50%-0.25rem)] flex-1 rounded-full px-3 text-sm font-bold transition-colors ${
                active
                  ? "bg-foil text-leather"
                  : "border border-line bg-card text-paperMuted hover:text-paper"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      {entry?.status === "READ" && (
        <button
          type="button"
          onClick={onReread}
          disabled={rereading}
          className="mt-3 min-h-tap w-full rounded-xl border border-line bg-card px-4 text-sm font-bold text-paper transition-colors hover:border-foil/50 disabled:opacity-40"
        >
          {rereading ? <Spinner size={16} className="mx-auto" /> : "Reler"}
        </button>
      )}
      {readingHistory.length > 1 && (
        <p className="mt-2 text-xs text-paperMuted">
          Você leu este livro {readingHistory.length}x — {readingHistory.map(formatShortDate).join(", ")}
        </p>
      )}
    </section>
  );
}
