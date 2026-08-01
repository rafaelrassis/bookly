"use client";

import { useEffect } from "react";
import { ErrorRetry } from "@/components/ui/ErrorRetry";

export default function PublicProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[u/error]", error);
  }, [error]);

  return <ErrorRetry message="Não foi possível carregar este perfil. Tente de novo." onRetry={reset} />;
}
