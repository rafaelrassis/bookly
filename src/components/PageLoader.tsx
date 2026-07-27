import { Spinner } from "./Spinner";

export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner size={32} className="text-foil" />
    </div>
  );
}
