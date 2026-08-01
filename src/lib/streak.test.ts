import { describe, it, expect } from "vitest";
import { computeWeeklyStreak, formatStreak } from "./streak";

// segunda-feira de referência, UTC, sem ambiguidade de fuso
const mon = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

describe("computeWeeklyStreak", () => {
  it("sem nenhum log retorna 0", () => {
    expect(computeWeeklyStreak([])).toBe(0);
  });

  it("1 log na semana corrente conta como streak de 1", () => {
    const now = mon(2026, 8, 5); // quarta-feira
    expect(computeWeeklyStreak([mon(2026, 8, 3)], now)).toBe(1);
  });

  it("3 semanas seguidas com log -> streak = 3", () => {
    const now = mon(2026, 8, 20);
    const logs = [mon(2026, 8, 17), mon(2026, 8, 10), mon(2026, 8, 3)];
    expect(computeWeeklyStreak(logs, now)).toBe(3);
  });

  it("pula uma semana no meio -> streak reseta, conta só a sequência mais recente", () => {
    const now = mon(2026, 8, 24);
    // log em 17/08 e 03/08, SEM log em 10/08 -> quebra entre as duas
    const logs = [mon(2026, 8, 17), mon(2026, 8, 3)];
    expect(computeWeeklyStreak(logs, now)).toBe(1);
  });

  it("semana corrente ainda sem log não quebra o streak (semana não acabou)", () => {
    // "now" numa semana sem log ainda, mas a semana anterior teve log
    const now = mon(2026, 8, 24); // semana de 24-30/ago
    const logs = [mon(2026, 8, 17), mon(2026, 8, 10)]; // semanas de 17 e 10 (consecutivas)
    expect(computeWeeklyStreak(logs, now)).toBe(2);
  });

  it("duas semanas inteiras sem log -> streak quebrado, retorna 0", () => {
    const now = mon(2026, 8, 24); // semana de 24-30/ago
    const logs = [mon(2026, 8, 3)]; // último log há 3 semanas
    expect(computeWeeklyStreak(logs, now)).toBe(0);
  });

  it("múltiplos logs na mesma semana contam como 1 semana só, não inflam o streak", () => {
    const now = mon(2026, 8, 5);
    const logs = [mon(2026, 8, 3), mon(2026, 8, 4), mon(2026, 8, 3)]; // 3 logs, mesma semana
    expect(computeWeeklyStreak(logs, now)).toBe(1);
  });

  it("atravessa virada de ano sem quebrar (dez -> jan, semanas consecutivas)", () => {
    const now = mon(2027, 1, 12);
    // semana de 29/dez/2026 (seg) e semana de 5/jan/2027 (seg) são consecutivas
    const logs = [mon(2027, 1, 5), mon(2026, 12, 29), mon(2026, 12, 22)];
    expect(computeWeeklyStreak(logs, now)).toBe(3);
  });

  it("virada de ano com quebra de verdade no meio -> não conta a virada como consecutiva por engano", () => {
    const now = mon(2027, 1, 12);
    // log em 5/jan/2027 e 22/dez/2026, SEM log em 29/dez -> quebra
    const logs = [mon(2027, 1, 5), mon(2026, 12, 22)];
    expect(computeWeeklyStreak(logs, now)).toBe(1);
  });
});

describe("formatStreak", () => {
  it("streak 0 não tem destaque nem emoji", () => {
    expect(formatStreak(0)).toBe("0 semanas");
  });

  it("streak 1 usa singular", () => {
    expect(formatStreak(1)).toBe("🔥 1 semana");
  });

  it("streak > 1 usa plural", () => {
    expect(formatStreak(3)).toBe("🔥 3 semanas");
  });
});
