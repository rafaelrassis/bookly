"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { BadgeCheckIcon, SettingsIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { withAt } from "@/lib/handle";
import { useStore } from "@/lib/store";
import { receiverTier, trustTier } from "@/lib/trust-badge";
import { ProfileStatsProvider, useProfileStats } from "./ProfileStatsContext";

const TABS = [
  { href: "/profile", label: "Visão geral" },
  { href: "/profile/atividade", label: "Atividade" },
  { href: "/profile/doacoes", label: "Doações" },
  { href: "/profile/estatisticas", label: "Estatísticas" },
];

function ProfileHeader() {
  const user = useStore((s) => s.user);
  const { confirmedCount, receivedCount } = useProfileStats();
  const tier = trustTier(confirmedCount);
  const receiverBadge = receiverTier(receivedCount);

  return (
    <>
      <div className="flex justify-end md:hidden">
        <Link
          href="/settings"
          aria-label="Configurações"
          className="flex min-h-tap min-w-tap items-center justify-center rounded-full text-paperMuted hover:text-paper"
        >
          <SettingsIcon />
        </Link>
      </div>

      <div className="flex items-start gap-4">
        <Avatar user={withAt(user.username)} size={72} />
        <div className="min-w-0 flex-1">
          <h1 className="text-h1 font-extrabold">{user.name}</h1>
          <p className="text-caption text-paperMuted">@{user.username}</p>
          {(tier || receiverBadge) && (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              {tier && (
                <span
                  className="inline-flex items-center gap-1 text-foil"
                  title="Baseado em doações confirmadas pelos dois lados."
                >
                  <BadgeCheckIcon size={16} />
                  <span className="text-xs font-extrabold uppercase tracking-wide">{tier.label}</span>
                </span>
              )}
              {receiverBadge && (
                <span
                  className="inline-flex items-center gap-1 text-foil"
                  title="Baseado em doações recebidas e confirmadas."
                >
                  <BadgeCheckIcon size={16} />
                  <span className="text-xs font-extrabold uppercase tracking-wide">
                    {receiverBadge.label}
                  </span>
                </span>
              )}
            </div>
          )}
          <p className="mt-1 text-xs text-paperMuted">
            <span className="font-bold text-paper">{user.followers}</span> seguidores ·{" "}
            <span className="font-bold text-paper">{user.following}</span> seguindo
          </p>
        </div>
        <Button asChild>
          <Link href="/profile/edit">Editar perfil</Link>
        </Button>
      </div>

      {user.bio && <p className="mt-4 text-sm text-paperMuted">{user.bio}</p>}
    </>
  );
}

function ProfileTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Seções do perfil" className="no-scrollbar mt-6 flex gap-1 overflow-x-auto border-b border-line">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-tap shrink-0 items-center border-b-2 px-3 text-sm font-bold transition-colors ${
              active ? "border-foil text-foil" : "border-transparent text-paperMuted hover:text-paper"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function ProfileTabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileStatsProvider>
      <div className="pt-6">
        <ProfileHeader />
        <ProfileTabs />
        {children}
      </div>
    </ProfileStatsProvider>
  );
}
