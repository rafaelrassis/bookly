"use client";

import { useEffect } from "react";
import { SectionError } from "@/components/SectionError";

export default function BookError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[book/error]", error);
  }, [error]);

  return <SectionError message="Não foi possível carregar este livro. Tente de novo." onRetry={reset} />;
}
