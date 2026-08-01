import Link from "next/link";
import { BookCover } from "@/components/BookCover";
import { Section } from "@/components/ui/Section";
import type { Book } from "@/lib/types";

export function RecommendationsSection({ recommendations }: { recommendations: Book[] }) {
  if (recommendations.length === 0) return null;

  return (
    <Section title="Quem leu isso também leu" className="mb-4">
      <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 lg:grid-cols-5">
        {recommendations.map((rec) => (
          <Link key={rec.id} href={`/book/${rec.id}`} className="w-28 shrink-0 md:w-auto">
            <BookCover book={rec} fluid sizes="(min-width: 1024px) 18vw, (min-width: 768px) 22vw, 112px" />
            <p className="mt-1.5 truncate text-xs font-bold">{rec.title}</p>
            <p className="truncate text-[11px] text-paperMuted">{rec.authors}</p>
          </Link>
        ))}
      </div>
    </Section>
  );
}
