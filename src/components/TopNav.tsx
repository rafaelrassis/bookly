"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { SettingsIcon } from "@/components/icons";
import { NAV_LINKS } from "@/lib/nav";

/** Cabeçalho de navegação pra tablet (md–lg, 768–1023px). Abaixo disso a
 * TabBar assume; a partir de lg a SideNav assume e esta barra se esconde. */
export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 hidden border-b border-line bg-leather/85 backdrop-blur md:block lg:hidden">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between px-5">
        <Link href="/home" className="rounded-md">
          <Logo className="text-2xl" />
        </Link>

        <nav aria-label="Navegação principal" className="flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors ${
                  active ? "bg-card text-foil" : "text-paperMuted hover:text-paper"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/settings"
            aria-label="Configurações"
            className={`ml-1 flex min-h-tap min-w-tap items-center justify-center rounded-full transition-colors ${
              pathname.startsWith("/settings") ? "text-foil" : "text-paperMuted hover:text-paper"
            }`}
          >
            <SettingsIcon />
          </Link>
        </nav>
      </div>
    </header>
  );
}
