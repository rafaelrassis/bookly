import { describe, expect, it } from "vitest";
import { computeWeeklyStreak, formatStreak } from "./streak";

describe("computeWeeklyStreak", () => {
  it("retorna 0 quando não há logs", () => {
    expect(computeWeeklyStreak([], new Date("2026-08-01T12:00:00Z"))).toBe(0);
  });

  it("retorna 1 quando há log só na semana corrente", () => {
    const now = new Date("2026-08-05T12:00:00Z"); // quarta-feira
    expect(computeWeeklyStreak([new Date("2026-08-04T09:00:00Z")], now)).toBe(1);
  });

  it("retorna 1 quando o único log é da semana passada (semana corrente ainda não quebrou)", () => {
    const now = new Date("2026-08-05T12:00:00Z"); // semana de 3 a 9 de ago
    expect(computeWeeklyStreak([new Date("2026-07-29T09:00:00Z")], now)).toBe(1);
  });

  it("retorna 0 quando o log mais recente é de 2+ semanas atrás", () => {
    const now = new Date("2026-08-05T12:00:00Z");
    expect(computeWeeklyStreak([new Date("2026-07-20T09:00:00Z")], now)).toBe(0);
  });

  it("conta 2 semanas consecutivas (semana corrente + anterior)", () => {
    const now = new Date("2026-08-05T12:00:00Z");
    const dates = [new Date("2026-08-04T09:00:00Z"), new Date("2026-07-29T09:00:00Z")];
    expect(computeWeeklyStreak(dates, now)).toBe(2);
  });

  it("conta 3 semanas consecutivas", () => {
    const now = new Date("2026-08-05T12:00:00Z");
    const dates = [
      new Date("2026-08-04T09:00:00Z"),
      new Date("2026-07-29T09:00:00Z"),
      new Date("2026-07-22T09:00:00Z"),
    ];
    expect(computeWeeklyStreak(dates, now)).toBe(3);
  });

  it("para de contar ao encontrar um buraco entre semanas com log", () => {
    const now = new Date("2026-08-05T12:00:00Z");
    const dates = [
      new Date("2026-08-04T09:00:00Z"), // semana corrente
      new Date("2026-07-15T09:00:00Z"), // 3 semanas atrás (buraco)
    ];
    expect(computeWeeklyStreak(dates, now)).toBe(1);
  });

  it("deduplica múltiplos logs na mesma semana ISO", () => {
    const now = new Date("2026-08-05T12:00:00Z");
    const dates = [
      new Date("2026-08-03T08:00:00Z"),
      new Date("2026-08-04T09:00:00Z"),
      new Date("2026-08-05T10:00:00Z"),
    ];
    expect(computeWeeklyStreak(dates, now)).toBe(1);
  });

  it("virada de ano: conta streak entre a última semana ISO de um ano e a primeira do seguinte", () => {
    // 2023-12-25 (seg) inicia a última semana ISO de 2023; 2024-01-01 (seg) inicia a primeira de 2024.
    const now = new Date("2024-01-03T12:00:00Z");
    const dates = [new Date("2024-01-01T09:00:00Z"), new Date("2023-12-25T09:00:00Z")];
    expect(computeWeeklyStreak(dates, now)).toBe(2);
  });

  it("virada de ano: 31/dez e 1/jan na mesma semana ISO contam como 1 semana só", () => {
    // Semana ISO de 2024-12-30 (seg) a 2025-01-05 (dom) engloba os dois dias.
    const now = new Date("2025-01-02T12:00:00Z");
    const dates = [new Date("2024-12-31T20:00:00Z"), new Date("2025-01-01T06:00:00Z")];
    expect(computeWeeklyStreak(dates, now)).toBe(1);
  });
});

describe("formatStreak", () => {
  it("formata 0 sem destaque e no singular/plural neutro", () => {
    expect(formatStreak(0)).toBe("0 semanas");
  });

  it("formata 1 com destaque e no singular", () => {
    expect(formatStreak(1)).toBe("🔥 1 semana");
  });

  it("formata valores maiores que 1 no plural", () => {
    expect(formatStreak(5)).toBe("🔥 5 semanas");
  });
});
