import { CopyIcon } from "@/components/icons";
import { SectionTitle } from "@/components/SectionTitle";
import { Spinner } from "@/components/Spinner";
import { Button } from "@/components/ui/Button";
import type { ClubDetail } from "@/lib/types";

type Props = {
  club: ClubDetail;
  editing: boolean;
  editName: string;
  editDesc: string;
  savingEdit: boolean;
  onEditNameChange: (value: string) => void;
  onEditDescChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onCopyCode: () => void;
  onRegenerateCode: () => void;
};

/** Ferramentas de quem criou o clube: código de convite (privados) e o
 * formulário de editar nome/descrição. */
export function AdminSection({
  club,
  editing,
  editName,
  editDesc,
  savingEdit,
  onEditNameChange,
  onEditDescChange,
  onSaveEdit,
  onCancelEdit,
  onCopyCode,
  onRegenerateCode,
}: Props) {
  return (
    <>
      {club.visibility === "private" && club.isCreator && club.code && (
        <div className="mt-3 flex w-full items-center justify-between rounded-2xl border border-foil/40 bg-card px-4 py-3">
          <div className="text-left">
            <p className="text-meta uppercase text-paperMuted">Código de convite</p>
            <p className="font-mono text-lg font-bold tracking-[0.3em] text-foil">{club.code}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onCopyCode}>
              <CopyIcon /> Copiar
            </Button>
            <Button variant="secondary" onClick={onRegenerateCode}>
              Gerar novo
            </Button>
          </div>
        </div>
      )}

      {editing && club.isCreator && (
        <section className="mt-5 rounded-2xl border border-foil/40 bg-card p-4">
          <SectionTitle>Editar clube</SectionTitle>
          <div className="mt-3 flex flex-col gap-2.5">
            <input
              type="text"
              value={editName}
              onChange={(e) => onEditNameChange(e.target.value)}
              placeholder="Nome do clube"
              aria-label="Nome do clube"
              className="rounded-xl border border-line bg-card2 px-4 py-2.5 text-sm text-paper"
            />
            <textarea
              value={editDesc}
              onChange={(e) => onEditDescChange(e.target.value)}
              rows={2}
              placeholder="Bio do clube"
              aria-label="Bio do clube"
              className="resize-none rounded-xl border border-line bg-card2 px-4 py-2.5 text-sm text-paper"
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" onClick={onCancelEdit}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={onSaveEdit} disabled={savingEdit}>
              {savingEdit ? <Spinner size={16} className="text-leather" /> : "Salvar"}
            </Button>
          </div>
        </section>
      )}
    </>
  );
}
