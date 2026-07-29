"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/** Boundary de erro do root layout — só dispara se o próprio layout.tsx
 * quebrar (error.tsx não cobre esse caso). Precisa declarar <html>/<body>
 * porque substitui o layout inteiro; por isso não reusa a UI/fontes normais. */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/global-error] falha não tratada no root layout:", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
          <p style={{ fontWeight: 700, fontSize: "1.125rem" }}>Algo deu errado</p>
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", opacity: 0.7 }}>
            Não foi possível carregar o Bookly. Tente de novo em instantes.
          </p>
        </div>
      </body>
    </html>
  );
}
