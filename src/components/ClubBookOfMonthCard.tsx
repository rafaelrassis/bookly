"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BookCover } from "@/components/BookCover";
import { BookPicker } from "@/components/BookPicker";
import { SectionTitle } from "@/components/SectionTitle";
import { Spinner } from "@/components/Spinner";
import { useModalA11y } from "@/lib/useModalA11y";
import { useStore } from "@/lib/store";
import type { ApiClubBookOfMonthDetail, ApiClubBookOfMonthHistoryItem, Book } from "@/lib/types";
import { apiErrorMessage } from "@/lib/apiError";

/** Modal de busca pra definir o livro do mês corrente (reaproveita o
 * BookPicker já usado na criação/edição de clube). */
function SetBookModal({
  onClose,
  onSave,
  saving,
}: {
  onClose: () => void;
  onSave: (book: Book) => void;
  saving: boolean;
}) {
  const [book, setBook] = useState<Book | null>(null);
  const dialogRef = useModalA11y<HTMLDivElement>(onClose);

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- fechar no clique fora é atalho de mouse; Esc/botão cobrem teclado
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-5"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Definir livro do mês"
        tabIndex={-1}
        className="w-full rounded-t-3xl border border-line bg-leather p-5 sm:max-w-md sm:rounded-3xl focus:outline-none"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Livro do mês</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-full text-paperDim hover:text-paper"
          >
            ✕
          </button>
        </div>
        <div className="mt-4">
          <BookPicker
            selected={book}
            onSelect={setBook}
            onClear={() => setBook(null)}
            placeholder="Buscar livro pro mês…"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-paperDim hover:text-paper"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => book && onSave(book)}
            disabled={!book || saving}
            className="flex items-center justify-center rounded-xl bg-foil px-4 py-2.5 text-sm font-bold text-leather disabled:opacity-60"
          >
            {saving ? <Spinner size={16} className="text-leather" /> : "Definir"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ClubBookOfMonthCard({ clubId, isCreator }: { clubId: string; isCreator: boolean }) {
  const showToast = useStore((s) => s.showToast);
  const [data, setData] = useState<ApiClubBookOfMonthDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingShelf, setAddingShelf] = useState(false);
  const [history, setHistory] = useState<ApiClubBookOfMonthHistoryItem[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/clubs/${clubId}/book-of-month`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: ApiClubBookOfMonthDetail | null) => {
        if (json) setData(json);
      })
      .finally(() => setLoading(false));
  }, [clubId]);

  useEffect(() => {
    load();
  }, [load]);

  async function setBookOfMonth(book: Book) {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/clubs/${clubId}/book-of-month`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId: book.id }),
      });
      if (!res.ok) {
        showToast(await apiErrorMessage(res, "Não foi possível definir o livro do mês"));
        return;
      }
      setModalOpen(false);
      showToast("Livro do mês definido ✦");
      load();
    } finally {
      setSaving(false);
    }
  }

  async function addToShelf(bookId: string) {
    if (addingShelf) return;
    setAddingShelf(true);
    try {
      const res = await fetch(`/api/books/${bookId}/shelf`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "WANT_TO_READ" }),
      });
      if (!res.ok) {
        showToast(await apiErrorMessage(res, "Não foi possível adicionar à estante"));
        return;
      }
      showToast("Adicionado a Quero ler");
      load();
    } finally {
      setAddingShelf(false);
    }
  }

  function toggleHistory() {
    if (history) {
      setHistory(null);
      return;
    }
    setHistoryLoading(true);
    fetch(`/api/clubs/${clubId}/book-of-month?history=1`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { items: ApiClubBookOfMonthHistoryItem[] } | null) => {
        setHistory(json?.items ?? []);
      })
      .finally(() => setHistoryLoading(false));
  }

  if (loading) return null;
  if (!data) return null;

  const { bookOfMonth } = data;

  if (!bookOfMonth) {
    if (!isCreator) return null;
    return (
      <section className="mt-6">
        <SectionTitle>Livro do mês</SectionTitle>
        <div className="mt-3 flex flex-col items-center gap-3 rounded-2xl border border-line bg-card p-5 text-center">
          <p className="text-sm text-paperDim">O clube ainda não tem um livro do mês.</p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-xl bg-foil px-4 py-2.5 text-sm font-bold text-leather hover:opacity-90"
          >
            Definir livro do mês
          </button>
        </div>
        {modalOpen && (
          <SetBookModal onClose={() => setModalOpen(false)} onSave={setBookOfMonth} saving={saving} />
        )}
      </section>
    );
  }

  const { book } = bookOfMonth;
  const percent =
    data.mine?.status === "READ"
      ? 100
      : data.mine?.status === "READING" && data.mine.currentPage != null && book.pages > 0
        ? Math.min(100, Math.round((data.mine.currentPage / book.pages) * 100))
        : 0;

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between">
        <SectionTitle>Livro do mês</SectionTitle>
        {isCreator && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="text-xs font-bold text-foil hover:opacity-80"
          >
            Trocar
          </button>
        )}
      </div>
      <div className="mt-3 rounded-2xl border border-foil/40 bg-card p-4">
        <Link href={`/book/${book.id}`} className="flex items-center gap-4">
          <BookCover book={book} width={56} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-bold">{book.title}</p>
            <p className="truncate text-sm text-paperDim">{book.authors}</p>
          </div>
        </Link>
        <p className="mt-3 text-xs text-paperDim">
          {data.started} de {data.totalMembers}{" "}
          {data.totalMembers === 1 ? "membro já começou" : "membros já começaram"} · {data.finished}{" "}
          {data.finished === 1 ? "já terminou" : "já terminaram"}
        </p>

        {data.mine ? (
          <div className="mt-3">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-bold">Seu progresso</span>
              <span className="text-paperDim">{percent}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-card2">
              <div className="h-full rounded-full bg-ribbon" style={{ width: `${percent}%` }} />
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => addToShelf(book.id)}
            disabled={addingShelf}
            className="mt-3 flex w-full items-center justify-center rounded-xl border border-line bg-card2 px-4 py-2.5 text-sm font-bold text-paper transition-colors hover:border-foil/50 disabled:opacity-60"
          >
            {addingShelf ? <Spinner size={16} className="text-paper" /> : "Adicionar à minha estante"}
          </button>
        )}

        <button
          type="button"
          onClick={toggleHistory}
          className="mt-3 text-xs font-bold text-paperDim hover:text-foil"
        >
          {history ? "Ocultar meses anteriores" : "Ver meses anteriores"}
        </button>
        {historyLoading && (
          <div className="mt-2 flex justify-center">
            <Spinner size={16} className="text-paperDim" />
          </div>
        )}
        {history && !historyLoading && (
          <div className="mt-2 flex flex-col gap-2">
            {history.length === 0 ? (
              <p className="text-xs text-paperDim">Sem histórico ainda.</p>
            ) : (
              history.map((item) => (
                <Link
                  key={item.month}
                  href={`/book/${item.book.id}`}
                  className="flex items-center gap-3 rounded-xl border border-line bg-card2 px-3 py-2 hover:border-foil/50"
                >
                  <BookCover book={item.book} width={28} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold">{item.book.title}</p>
                    <p className="text-[10px] text-paperDim">{item.month}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      {modalOpen && (
        <SetBookModal onClose={() => setModalOpen(false)} onSave={setBookOfMonth} saving={saving} />
      )}
    </section>
  );
}
