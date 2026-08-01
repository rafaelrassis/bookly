"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { SettingsIcon } from "@/components/icons";
import { NAV_LINKS } from "@/lib/nav";

/** Navegação lateral fixa do desktop (>= lg). Reaproveita NAV_LINKS —
 * a mesma lista usada pela TabBar no mobile e pela TopNav no tablet. */
export function SideNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="sticky top-6 hidden h-fit w-60 shrink-0 flex-col gap-1 lg:flex"
    >
      <Link href="/home" className="mb-4 rounded-md px-2">
        <Logo />
      </Link>

      {NAV_LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-tap items-center gap-3 rounded-xl px-3 text-sm font-bold transition-colors ${
              active ? "bg-card text-foil" : "text-paperMuted hover:bg-card2 hover:text-paper"
            }`}
          >
            {link.icon}
            {link.label}
          </Link>
        );
      })}

      <Link
        href="/settings"
        aria-current={pathname.startsWith("/settings") ? "page" : undefined}
        className={`mt-2 flex min-h-tap items-center gap-3 rounded-xl px-3 text-sm font-bold transition-colors ${
          pathname.startsWith("/settings")
            ? "bg-card text-foil"
            : "text-paperMuted hover:bg-card2 hover:text-paper"
        }`}
      >
        <SettingsIcon />
        Configurações
      </Link>
    </nav>
  );
}
