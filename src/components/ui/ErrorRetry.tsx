import { Button } from "@/components/ui/Button";

type ErrorRetryProps = {
  message: string;
  onRetry: () => void;
  className?: string;
};

/** Bloco de erro com retry — substitui os 4 blocos idênticos reescritos em
 * Home, Estante, Clubes e Busca. */
export function ErrorRetry({ message, onRetry, className = "" }: ErrorRetryProps) {
  return (
    <div role="alert" className={`flex flex-col items-center gap-3 py-10 text-center ${className}`}>
      <p className="text-caption text-paperMuted">{message}</p>
      <Button onClick={onRetry}>Tentar de novo</Button>
    </div>
  );
}
