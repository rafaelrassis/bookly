import { Skeleton } from "@/components/Skeleton";

export default function BookLoading() {
  return (
    <div className="pt-4" role="status" aria-label="Carregando livro">
      <Skeleton className="h-10 w-10 rounded-full" />

      <div className="mt-2 flex gap-5">
        <Skeleton className="h-[162px] w-[108px] shrink-0 rounded-md" />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="mt-2 h-9 w-20" />
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <Skeleton className="h-10 flex-1 rounded-full" />
        <Skeleton className="h-10 flex-1 rounded-full" />
        <Skeleton className="h-10 flex-1 rounded-full" />
      </div>

      <Skeleton className="mt-6 h-32 w-full rounded-2xl" />
      <Skeleton className="mt-6 h-24 w-full rounded-2xl" />
    </div>
  );
}
