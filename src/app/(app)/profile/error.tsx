"use client";

import { useEffect } from "react";
import { ErrorRetry } from "@/components/ui/ErrorRetry";

export default function ProfileError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[profile/error]", error);
  }, [error]);

  return <ErrorRetry message="Não foi possível carregar seu perfil. Tente de novo." onRetry={reset} />;
}
