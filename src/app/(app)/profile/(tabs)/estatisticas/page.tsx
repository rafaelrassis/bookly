"use client";

import { Badges } from "@/components/Badges";
import { YearInBooksCard } from "@/components/YearInBooksCard";
import { Section } from "@/components/ui/Section";
import { formatCount, formatDecimal } from "@/lib/format";
import { useProfileStats } from "../ProfileStatsContext";

const HISTOGRAM_LABELS: Record<number, string> = { 0.5: "½★", 5: "★★★★★" };

export default function ProfileStatsPage() {
  const {
    readCount,
    pagesRead,
    reviewCount,
    donatedCount,
    confirmedCount,
    avgRating,
    histogram,
    maxCount,
  } = useProfileStats();

  const stats = [
    { label: "lidos", value: String(readCount) },
    { label: "páginas", value: formatCount(pagesRead) },
    { label: "reviews", value: String(reviewCount) },
    { label: "livros doados", value: String(donatedCount) },
    { label: "doações confirmadas", value: String(confirmedCount) },
  ];

  return (
    <div className="mb-4">
      <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line xs:grid-cols-3 md:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card px-3 py-4 text-center">
            <dd className="font-display text-2xl font-bold tabular-nums text-foil">{stat.value}</dd>
            <dt className="mt-1 text-meta uppercase text-paperMuted">{stat.label}</dt>
          </div>
        ))}
      </dl>

      <Badges donatedCount={donatedCount} />

      <YearInBooksCard />

      <Section title="Suas notas">
        <div className="flex items-end gap-4 rounded-2xl border border-line bg-card p-4">
          <div className="flex-1">
            <div className="flex h-20 gap-1">
              {histogram.map(({ value, count }) => {
                const height = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
                const isMax = maxCount > 0 && count === maxCount;
                return (
                  <div
                    key={value}
                    className="flex h-full flex-1 flex-col justify-end"
                    title={`${formatDecimal(value)}: ${count}`}
                  >
                    <div
                      className={`w-full rounded-t-sm ${isMax ? "bg-foil" : "bg-line"}`}
                      style={{ height: `${Math.max(height, 5)}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-1.5 flex justify-between text-meta text-paperMuted">
              <span>{HISTOGRAM_LABELS[0.5]}</span>
              <span className="text-foil">{HISTOGRAM_LABELS[5]}</span>
            </div>
          </div>
          <div className="pb-4 text-center">
            <p className="font-display text-3xl font-black text-foil">
              {avgRating !== null ? formatDecimal(avgRating) : "–"}
            </p>
            <p className="text-meta text-paperMuted">sua média</p>
          </div>
        </div>
      </Section>
    </div>
  );
}
