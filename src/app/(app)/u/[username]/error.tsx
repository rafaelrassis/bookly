"use client";

import { useEffect } from "react";
import { SectionError } from "@/components/SectionError";

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

  return <SectionError message="Não foi possível carregar este perfil. Tente de novo." onRetry={reset} />;
}
