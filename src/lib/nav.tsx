import type { ReactNode } from "react";

export type NavLink = { href: string; label: string; icon: ReactNode };

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** Links de navegação primária, compartilhados por TabBar, TopNav e SideNav
 * (antes duplicados e divergentes entre TabBar e TopNav). */
export const NAV_LINKS: NavLink[] = [
  {
    href: "/home",
    label: "Início",
    icon: (
      <svg {...iconProps}>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
        <path d="M9.5 21v-6h5v6" />
      </svg>
    ),
  },
  {
    href: "/shelf",
    label: "Estante",
    icon: (
      <svg {...iconProps}>
        <path d="M4 4v16" />
        <path d="M9 4v16" />
        <path d="m13.5 5 4.5 15" />
        <path d="M3 20h18" />
      </svg>
    ),
  },
  {
    href: "/search",
    label: "Buscar",
    icon: (
      <svg {...iconProps}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.8-3.8" />
      </svg>
    ),
  },
  {
    href: "/clubs",
    label: "Clube",
    icon: (
      <svg {...iconProps}>
        <circle cx="9" cy="8.5" r="3.5" />
        <path d="M2.5 19.5c.9-2.9 3.4-4.5 6.5-4.5s5.6 1.6 6.5 4.5" />
        <path d="M15.5 5.5a3.5 3.5 0 0 1 0 6.3" />
        <path d="M17.5 15.4c2 .6 3.4 2 4 4.1" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Perfil",
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 20c1.2-3.2 4.1-5 7.5-5s6.3 1.8 7.5 5" />
      </svg>
    ),
  },
];
