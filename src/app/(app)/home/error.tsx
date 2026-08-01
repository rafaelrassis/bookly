"use client";

import { useEffect } from "react";
import { ErrorRetry } from "@/components/ui/ErrorRetry";

export default function HomeError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[home/error]", error);
  }, [error]);

  return <ErrorRetry message="Não foi possível carregar esta página. Tente de novo em instantes." onRetry={reset} />;
}
