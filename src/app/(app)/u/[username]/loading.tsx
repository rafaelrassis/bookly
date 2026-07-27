import { Skeleton } from "@/components/Skeleton";

export default function PublicProfileLoading() {
  return (
    <div className="px-5 pt-4" role="status" aria-label="Carregando perfil">
      <Skeleton className="h-10 w-10 rounded-full" />

      <div className="mt-4 flex items-center gap-4">
        <Skeleton className="h-[72px] w-[72px] shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-36" />
        </div>
      </div>

      <Skeleton className="mt-4 h-11 w-full rounded-xl" />
      <Skeleton className="mt-6 h-24 w-full rounded-2xl" />
    </div>
  );
}
