"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "@/lib/nav";

/** Navegação mobile (< md). O fundo cobre a largura toda pra não parecer
 * uma ilha flutuante em telas de 481–767px; a lista de abas fica centrada
 * e com largura máxima pra não esticar demais. */
export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-md">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <li key={link.href} className="flex-1">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-tap flex-col items-center justify-center gap-0.5 px-1 py-2.5 text-meta transition-colors ${
                  active ? "text-foil" : "text-paperMuted hover:text-paper"
                }`}
              >
                <span aria-hidden="true">{link.icon}</span>
                <span className="leading-none">{link.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
