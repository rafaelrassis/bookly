import { Skeleton } from "@/components/Skeleton";

export default function ProfileLoading() {
  return (
    <div className="pt-6" role="status" aria-label="Carregando perfil">
      <div className="flex justify-end">
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>

      <div className="flex items-center gap-4">
        <Skeleton className="h-[72px] w-[72px] shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>

      <Skeleton className="mt-6 h-20 w-full rounded-2xl" />
      <Skeleton className="mt-6 h-32 w-full rounded-2xl" />
    </div>
  );
}
