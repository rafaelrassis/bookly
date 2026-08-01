"use client";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

type ConfirmSheetProps = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/** Sheet de confirmação para ações irreversíveis de doação (concluir,
 * remover, confirmar recebimento) — antes um toque em alvo de 28px
 * encerrava a negociação sem chance de voltar atrás. */
export function ConfirmSheet({
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancelar",
  danger = false,
  busy = false,
  onConfirm,
  onClose,
}: ConfirmSheetProps) {
  return (
    <Sheet onClose={onClose} title={title}>
      <p className="text-caption text-paperMuted">{message}</p>
      <div className="mt-5 flex flex-col-reverse gap-2 xs:flex-row xs:justify-end">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} disabled={busy}>
          {confirmLabel}
        </Button>
      </div>
    </Sheet>
  );
}
