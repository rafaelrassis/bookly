import type { KeyboardEvent } from "react";

/** Navegação por setas dentro de um `role="tablist"` (padrão ARIA de tabs):
 * ArrowLeft/ArrowRight movem o foco entre os `role="tab"` do container,
 * com wrap-around nas pontas. Usar no `onKeyDown` do elemento com role
 * `tablist`. */
export function handleTablistKeyDown(e: KeyboardEvent<HTMLElement>) {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  const tabs = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'));
  if (tabs.length === 0) return;
  const currentIndex = tabs.indexOf(document.activeElement as HTMLElement);
  if (currentIndex === -1) return;
  e.preventDefault();
  const delta = e.key === "ArrowRight" ? 1 : -1;
  const next = tabs[(currentIndex + delta + tabs.length) % tabs.length];
  next.focus();
}
