import { GiftIcon } from "@/components/icons";
import { Section } from "@/components/ui/Section";

type BadgeItem = { key: string; icon: React.ReactNode; label: string; count: number };

/** Seção "Selos" no perfil (próprio e público) — total de livros doados.
 * O lado do recebedor tem selo próprio por tier (ver trust-badge.ts,
 * receiverTier), exibido junto do selo de confiança do doador no cabeçalho
 * do perfil, não aqui. */
export function Badges({ donatedCount }: { donatedCount: number }) {
  if (donatedCount === 0) return null;

  const badges: BadgeItem[] = [
    { key: "doador", icon: <GiftIcon size={18} />, label: "Doador", count: donatedCount },
  ];

  return (
    <Section title="Selos">
      <div className="mt-3 flex gap-3">
        {badges.map((badge) => (
          <div
            key={badge.key}
            className="flex flex-1 items-center gap-3 rounded-2xl border border-line bg-card p-4"
          >
            <span className="text-foil">{badge.icon}</span>
            <div>
              <p className="font-display text-xl font-bold text-foil">{badge.count}</p>
              <p className="text-meta uppercase text-paperMuted">
                {badge.label}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
