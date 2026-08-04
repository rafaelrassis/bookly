import { useEffect, useState } from "react";
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
  onDatesChange: (dates: { startedAt?: string; finishedAt?: string }) => Promise<void>;
};

/** ISO -> "YYYY-MM-DD" pro valor do input[type=date]. */
function toInputDate(iso?: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

/** Botões de status da estante — a ação mais usada da tela do livro. */
export function StatusSection({ entry, readingHistory, rereading, onStatusTap, onReread, onDatesChange }: Props) {
  const [startInput, setStartInput] = useState(toInputDate(entry?.startedAt));
  const [endInput, setEndInput] = useState(toInputDate(entry?.finishedAt));
  const [savingDates, setSavingDates] = useState(false);

  useEffect(() => {
    setStartInput(toInputDate(entry?.startedAt));
    setEndInput(toInputDate(entry?.finishedAt));
  }, [entry?.startedAt, entry?.finishedAt]);

  async function commitStart(value: string) {
    if (!value || value === toInputDate(entry?.startedAt)) return;
    setSavingDates(true);
    try {
      await onDatesChange({ startedAt: value });
    } finally {
      setSavingDates(false);
    }
  }

  async function commitEnd(value: string) {
    if (!value || value === toInputDate(entry?.finishedAt)) return;
    setSavingDates(true);
    try {
      await onDatesChange({ finishedAt: value });
    } finally {
      setSavingDates(false);
    }
  }

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
      {(entry?.status === "READ" || entry?.status === "READING") &&
        (entry.startedAt || entry.finishedAt) && (
          <p className="mt-2 text-xs text-paperMuted">
            {entry.startedAt && `Início: ${formatShortDate(entry.startedAt)}`}
            {entry.startedAt && entry.finishedAt && " · "}
            {entry.finishedAt && `Fim: ${formatShortDate(entry.finishedAt)}`}
          </p>
        )}
      {entry && (
        <div className="mt-3 flex gap-2">
          <label className="flex-1 text-xs text-paperMuted">
            Início
            <input
              type="date"
              value={startInput}
              max={endInput || undefined}
              disabled={savingDates}
              onChange={(e) => setStartInput(e.target.value)}
              onBlur={(e) => commitStart(e.target.value)}
              aria-label="Data de início da leitura"
              className="mt-1 min-h-tap w-full rounded-xl border border-line bg-card px-3 text-sm text-paper disabled:opacity-40"
            />
          </label>
          <label className="flex-1 text-xs text-paperMuted">
            Fim
            <input
              type="date"
              value={endInput}
              min={startInput || undefined}
              disabled={savingDates}
              onChange={(e) => setEndInput(e.target.value)}
              onBlur={(e) => commitEnd(e.target.value)}
              aria-label="Data de término da leitura"
              className="mt-1 min-h-tap w-full rounded-xl border border-line bg-card px-3 text-sm text-paper disabled:opacity-40"
            />
          </label>
        </div>
      )}
    </section>
  );
}
