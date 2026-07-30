"use client";

import { useEffect } from "react";
import { SectionError } from "@/components/SectionError";

export default function CitacaoError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[citacao/error]", error);
  }, [error]);

  return <SectionError message="Não foi possível carregar esta citação. Tente de novo." onRetry={reset} />;
}
