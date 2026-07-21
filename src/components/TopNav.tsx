"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";

const LINKS = [
  { href: "/home", label: "Início" },
  { href: "/shelf", label: "Estante" },
  { href: "/clubs", label: "Clube" },
  { href: "/profile", label: "Perfil" },
];

function GearIcon() {
  return (
    <svg
      width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47V21a2 2 0 1 1-4 0v-.09a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.6 1.6 0 0 0 4.6 15a1.6 1.6 0 0 0-1.47-.97H3a2 2 0 1 1 0-4h.09A1.6 1.6 0 0 0 4.56 9a1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.77.32H9a1.6 1.6 0 0 0 .97-1.47V3a2 2 0 1 1 4 0v.09a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.77V9a1.6 1.6 0 0 0 1.47.97H21a2 2 0 1 1 0 4h-.09a1.6 1.6 0 0 0-1.47.97z" />
    </svg>
  );
}

/** Cabeçalho de navegação para desktop (>= md). No mobile, a TabBar assume. */
export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 hidden border-b border-line bg-leather/85 backdrop-blur md:block">
      <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-5">
        <Link href="/home" aria-label="Início" className="rounded-md">
          <Logo className="text-2xl" />
        </Link>

        <nav aria-label="Navegação principal" className="flex items-center gap-1">
          {LINKS.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors ${
                  active ? "bg-card text-foil" : "text-paperDim hover:text-paper"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/settings"
            aria-label="Configurações"
            className={`ml-1 rounded-full p-2 transition-colors ${
              pathname.startsWith("/settings") ? "text-foil" : "text-paperDim hover:text-paper"
            }`}
          >
            <GearIcon />
          </Link>
        </nav>
      </div>
    </header>
  );
}
