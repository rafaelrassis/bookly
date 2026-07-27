"use client";

import { useEffect } from "react";
import { SectionError } from "@/components/SectionError";

export default function ReviewError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[review/error]", error);
  }, [error]);

  return <SectionError message="Não foi possível carregar esta review. Tente de novo." onRetry={reset} />;
}
