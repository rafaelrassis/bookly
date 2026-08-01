const WEEKDAYS = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

export function weekdayName(date: Date = new Date()): string {
  return WEEKDAYS[date.getDay()];
}

/** Saudação por horário local do servidor — aproximação; não vale a pena
 * mandar timezone do cliente só pra isso. */
export function timeGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 5) return "Boa noite";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}
