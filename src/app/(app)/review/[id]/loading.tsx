import { Skeleton } from "@/components/Skeleton";

export default function ReviewLoading() {
  return (
    <div className="pt-4" role="status" aria-label="Carregando review">
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-5 w-24" />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>

      <div className="mt-4 flex items-start gap-4">
        <Skeleton className="h-[108px] w-[72px] shrink-0 rounded-md" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-full" />
        </div>
      </div>

      <Skeleton className="mt-4 h-20 w-full rounded-xl" />
    </div>
  );
}
