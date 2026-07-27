"use client";

import { useEffect } from "react";
import { SectionError } from "@/components/SectionError";

export default function HomeError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[home/error]", error);
  }, [error]);

  return <SectionError onRetry={reset} />;
}
