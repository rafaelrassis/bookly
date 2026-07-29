"use client";

import { useEffect, useRef, useState } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { Spinner } from "@/components/Spinner";
import { useStore } from "@/lib/store";
import { apiErrorMessage } from "@/lib/apiError";

type GoalData = {
  year: number;
  target: number | null;
  read: number;
  percent: number | null;
  pace: number | null;
};

function ProgressRing({ percent }: { percent: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, percent) / 100) * c;
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90" aria-hidden>
      <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" className="text-card2" strokeWidth="8" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="currentColor"
        className="text-foil"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset .5s ease" }}
      />
    </svg>
  );
}

function paceLabel(pace: number): string {
  if (pace > 0) return `${pace} livro${pace > 1 ? "s" : ""} adiantado`;
  if (pace < 0) return `${Math.abs(pace)} livro${Math.abs(pace) > 1 ? "s" : ""} atrasado`;
  return "No ritmo certo";
}

async function saveGoal(year: number, targetBooks: number): Promise<GoalData> {
  const res = await fetch(`/api/goals/${year}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetBooks }),
  });
  if (!res.ok) {
    throw new Error(await apiErrorMessage(res, "Falha ao salvar meta"));
  }
  // PUT devolve a linha crua (ReadingGoal); progresso derivado (read/percent/pace)
  // só vem do GET, então recarrega pra manter o card em sincronia.
  const refreshed = await fetch(`/api/goals/${year}`);
  if (!refreshed.ok) throw new Error("Falha ao carregar progresso da meta");
  return refreshed.json();
}

function EditGoalSheet({
  year,
  initialTarget,
  onClose,
  onSaved,
}: {
  year: number;
  initialTarget: number | null;
  onClose: () => void;
  onSaved: (goal: GoalData) => void;
}) {
  const showToast = useStore((s) => s.showToast);
  const [value, setValue] = useState(initialTarget ? String(initialTarget) : "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const targetBooks = Number(value);
    if (!Number.isInteger(targetBooks) || targetBooks < 1 || targetBooks > 1000) {
      showToast("Meta deve ser um número inteiro entre 1 e 1000");
      return;
    }
    setSaving(true);
    try {
      const goal = await saveGoal(year, targetBooks);
      onSaved(goal);
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Falha ao salvar meta");
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet onClose={onClose} title={`Meta de ${year}`}>
      <label htmlFor="reading-goal-input" className="text-xs font-bold text-paperDim">
        Quantos livros você quer ler este ano?
      </label>
      <input
        id="reading-goal-input"
        type="number"
        inputMode="numeric"
        min={1}
        max={1000}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        placeholder="Ex.: 24"
        // eslint-disable-next-line jsx-a11y/no-autofocus -- sheet recém-aberto, único campo
        autoFocus
        className="mt-2 w-full rounded-xl border border-line bg-card2 px-4 py-2.5 text-base text-paper placeholder:text-paperDim/60"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={!value.trim() || saving}
        className="mt-3 flex w-full items-center justify-center rounded-xl bg-foil px-4 py-2.5 text-sm font-bold text-leather disabled:opacity-40"
      >
        {saving ? <Spinner size={16} className="text-leather" /> : "Salvar meta"}
      </button>
    </BottomSheet>
  );
}

export function ReadingGoalCard() {
  const showToast = useStore((s) => s.showToast);
  const year = new Date().getFullYear();
  const [goal, setGoal] = useState<GoalData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const celebratedRef = useRef(false);

  useEffect(() => {
    fetch(`/api/goals/${year}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: GoalData) => {
        setGoal(data);
        setLoaded(true);
        if (data.percent === 100) celebratedRef.current = true;
      })
      .catch(() => setLoaded(true));
  }, [year]);

  function handleSaved(data: GoalData) {
    setGoal(data);
    if (data.percent === 100 && !celebratedRef.current) {
      celebratedRef.current = true;
      showToast("Meta concluída 🎉");
    }
  }

  if (!loaded) return null;

  const hasGoal = goal?.target != null;

  return (
    <section className="mt-5 rounded-2xl border border-line bg-card p-4">
      {!hasGoal ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-paperDim">
              Meta de {year}
            </p>
            <p className="mt-1 text-sm text-paperDim">Defina quantos livros quer ler neste ano</p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="shrink-0 rounded-xl bg-foil px-4 py-2 text-xs font-bold text-leather"
          >
            Definir meta
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <ProgressRing percent={goal.percent ?? 0} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display text-lg font-bold text-paper">{goal.percent ?? 0}%</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-paperDim">
              Meta de {year}
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-paper">
              {goal.read} <span className="text-paperDim">de {goal.target}</span> livros
            </p>
            {goal.percent === 100 ? (
              <p className="mt-1 text-xs text-foil">Meta concluída 🎉</p>
            ) : (
              goal.pace != null && <p className="mt-1 text-xs text-paperDim">{paceLabel(goal.pace)}</p>
            )}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-2 text-xs font-bold text-foil hover:opacity-80"
            >
              Editar meta
            </button>
          </div>
        </div>
      )}

      {editing && (
        <EditGoalSheet
          year={year}
          initialTarget={goal?.target ?? null}
          onClose={() => setEditing(false)}
          onSaved={handleSaved}
        />
      )}
    </section>
  );
}
