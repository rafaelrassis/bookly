import { Skeleton } from "@/components/Skeleton";

export default function HomeLoading() {
  return (
    <div className="pt-5" role="status" aria-label="Carregando início">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>

      <Skeleton className="mt-5 h-12 w-full rounded-xl" />

      <div className="mt-6 flex flex-col gap-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>

      <div className="mt-7 flex gap-3 overflow-hidden">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="mt-3 flex gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-36 w-24 shrink-0 rounded-md" />
        ))}
      </div>

      <div className="mt-7 flex flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
