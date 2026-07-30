import { Skeleton } from "@/components/Skeleton";

export default function CitacaoLoading() {
  return (
    <div className="px-5 pt-4" role="status" aria-label="Carregando citação">
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-5 w-24" />
      </div>

      <Skeleton className="mt-6 h-40 w-full rounded-2xl" />

      <div className="mt-4 flex items-center gap-3">
        <Skeleton className="h-[57px] w-[38px] shrink-0 rounded-md" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>

      <Skeleton className="mt-6 h-12 w-full rounded-xl" />
    </div>
  );
}
