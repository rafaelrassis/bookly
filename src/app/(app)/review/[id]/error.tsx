"use client";

import { useEffect } from "react";
import { ErrorRetry } from "@/components/ui/ErrorRetry";

export default function ReviewError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[review/error]", error);
  }, [error]);

  return <ErrorRetry message="Não foi possível carregar esta review. Tente de novo." onRetry={reset} />;
}
