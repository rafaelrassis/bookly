import { GiftIcon, InboxIcon } from "@/components/icons";
import { SectionTitle } from "@/components/SectionTitle";

type BadgeItem = { key: string; icon: React.ReactNode; label: string; count: number };

/** Seção "Selos" no perfil (próprio e público) — reputação de doação, sem
 * ranking entre usuários. Selo só aparece se count > 0; seção some por
 * completo se nenhum dos dois. */
export function Badges({
  donatedCount,
  receivedCount,
}: {
  donatedCount: number;
  receivedCount: number;
}) {
  if (donatedCount === 0 && receivedCount === 0) return null;

  const badges: BadgeItem[] = [];
  if (donatedCount > 0) {
    badges.push({ key: "doador", icon: <GiftIcon size={18} />, label: "Doador", count: donatedCount });
  }
  if (receivedCount > 0) {
    badges.push({
      key: "recebedor",
      icon: <InboxIcon size={18} />,
      label: "Recebedor",
      count: receivedCount,
    });
  }

  return (
    <section className="mt-6">
      <SectionTitle>Selos</SectionTitle>
      <div className="mt-3 flex gap-3">
        {badges.map((badge) => (
          <div
            key={badge.key}
            className="flex flex-1 items-center gap-3 rounded-2xl border border-line bg-card p-4"
          >
            <span className="text-foil">{badge.icon}</span>
            <div>
              <p className="font-display text-xl font-bold text-foil">{badge.count}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-paperDim">
                {badge.label}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
