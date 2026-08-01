import { Skeleton } from "@/components/Skeleton";

export default function YearInBooksLoading() {
  return (
    <div className="pt-4" role="status" aria-label="Carregando ano em livros">
      <Skeleton className="h-10 w-10 rounded-full" />

      <div className="mt-4 flex items-center gap-3">
        <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      <Skeleton className="mt-6 h-32 w-full rounded-2xl" />
    </div>
  );
}
