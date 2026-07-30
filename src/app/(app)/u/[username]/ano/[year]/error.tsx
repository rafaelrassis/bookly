"use client";

import { useEffect } from "react";
import { SectionError } from "@/components/SectionError";

export default function YearInBooksError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[u/ano/error]", error);
  }, [error]);

  return <SectionError message="Não foi possível carregar esta página. Tente de novo." onRetry={reset} />;
}
