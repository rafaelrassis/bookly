"use client";

import { useRef, useState } from "react";
import { Spinner } from "@/components/Spinner";
import { useStore } from "@/lib/store";
import { apiErrorMessage } from "@/lib/apiError";

type ImportReport = {
  total: number;
  imported: number;
  deferred: number;
  failed: number;
  notFound: { title: string; author: string }[];
};

/** Upload do goodreads_library_export.csv pra /api/import/goodreads e
 * relatório honesto do resultado (importados, adiados por cota, não
 * encontrados) — sem esconder falhas do usuário. */
export function GoodreadsImport() {
  const showToast = useStore((s) => s.showToast);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [notFoundOpen, setNotFoundOpen] = useState(false);

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImporting(true);
    setReport(null);
    setNotFoundOpen(false);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/import/goodreads", { method: "POST", body: form });
      if (!res.ok) throw new Error(await apiErrorMessage(res, "Falha ao importar o arquivo."));
      const body: ImportReport = await res.json();
      setReport(body);
      showToast(`${body.imported} livro${body.imported === 1 ? "" : "s"} importado${body.imported === 1 ? "" : "s"} ✦`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Falha ao importar o arquivo.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <p className="text-sm text-paperDim">
        Exporte sua biblioteca no Goodreads (My Books → Import/Export → Export Library) e envie o
        arquivo .csv aqui.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handlePick}
        className="hidden"
        disabled={importing}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={importing}
        className="mt-3 w-full rounded-xl border border-line bg-card px-4 py-3 text-sm font-bold text-paper transition-colors hover:bg-card2 disabled:opacity-60"
      >
        {importing ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner size={16} label="Importando" />
            Importando… isso pode levar um minuto.
          </span>
        ) : (
          "Importar do Goodreads"
        )}
      </button>

      {report && (
        <div className="mt-3 rounded-2xl border border-line bg-card p-4 text-sm">
          <p className="font-bold text-paper">
            ✅ {report.imported} livro{report.imported === 1 ? "" : "s"} importado
            {report.imported === 1 ? "" : "s"} de {report.total}.
          </p>

          {report.deferred > 0 && (
            <p className="mt-2 text-paperDim">
              ⏳ {report.deferred} não processado{report.deferred === 1 ? "" : "s"} hoje (limite
              diário). Reimporte o mesmo arquivo amanhã — não vai duplicar.
            </p>
          )}

          {report.failed > 0 && (
            <p className="mt-2 text-paperDim">
              ⚠️ {report.failed} livro{report.failed === 1 ? "" : "s"} com erro ao gravar. Tente
              reimportar o mesmo arquivo.
            </p>
          )}

          {report.notFound.length > 0 && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setNotFoundOpen((v) => !v)}
                aria-expanded={notFoundOpen}
                className="font-medium text-paperDim underline decoration-dotted underline-offset-2 hover:text-paper"
              >
                ❓ {report.notFound.length} não encontrado{report.notFound.length === 1 ? "" : "s"}
              </button>
              {notFoundOpen && (
                <>
                  <ul className="mt-2 flex flex-col gap-1 text-xs text-paperDim">
                    {report.notFound.map((b, i) => (
                      <li key={i}>
                        {b.title}
                        {b.author ? ` — ${b.author}` : ""}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-paperDim">
                    Adicione esses manualmente pela busca de livros.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
