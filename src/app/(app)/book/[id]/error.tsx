"use client";

import { useEffect } from "react";
import { ErrorRetry } from "@/components/ui/ErrorRetry";

export default function BookError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[book/error]", error);
  }, [error]);

  return <ErrorRetry message="Não foi possível carregar este livro. Tente de novo." onRetry={reset} />;
}
