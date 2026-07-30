const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Início (segunda-feira, 00:00 UTC) da semana ISO que contém `date`. */
function isoWeekStart(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7; // 1 (seg) .. 7 (dom)
  d.setUTCDate(d.getUTCDate() - day + 1);
  return d.getTime();
}

/**
 * Streak semanal de leitura: nº de semanas ISO consecutivas com pelo menos
 * 1 ProgressLog, contando pra trás a partir da semana mais recente com log,
 * até achar uma semana sem log. A semana corrente sem log ainda não quebra
 * o streak (ela não acabou) — só uma semana inteira sem log quebra.
 */
export function computeWeeklyStreak(loggedDates: Date[], now: Date = new Date()): number {
  if (loggedDates.length === 0) return 0;

  const weekStarts = Array.from(new Set(loggedDates.map(isoWeekStart))).sort((a, b) => b - a);

  const currentWeekStart = isoWeekStart(now);
  const mostRecent = weekStarts[0];

  // semana anterior à corrente também sem log -> streak já quebrado.
  if (mostRecent < currentWeekStart - WEEK_MS) return 0;

  let streak = 1;
  for (let i = 1; i < weekStarts.length; i++) {
    if (weekStarts[i - 1] - weekStarts[i] === WEEK_MS) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/** Texto neutro pro streak — sem destaque em 0, sem cor de alerta. */
export function formatStreak(streak: number): string {
  const weeks = streak === 1 ? "semana" : "semanas";
  return streak > 0 ? `🔥 ${streak} ${weeks}` : `0 ${weeks}`;
}
