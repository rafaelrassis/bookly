import { LockIcon } from "@/components/icons";
import { Spinner } from "@/components/Spinner";
import { Button } from "@/components/ui/Button";
import type { ClubDetail } from "@/lib/types";

type Props = {
  club: ClubDetail;
  membershipBusy: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onDelete: () => void;
  onOpenEdit: () => void;
};

/** Identidade do clube: título, descrição e a ação principal de
 * participação (participar/sair/excluir + editar pra quem criou). */
export function ClubHeader({ club, membershipBusy, onJoin, onLeave, onDelete, onOpenEdit }: Props) {
  return (
    <section className="mt-2 flex flex-col items-center text-center">
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
        {club.visibility === "private" && (
          <span className="text-paperDim" aria-label="Clube privado">
            <LockIcon size={16} />
          </span>
        )}
        {club.name}
      </h1>
      <p className="mt-2 max-w-72 text-sm text-paperMuted">{club.desc}</p>

      <div className="mt-5 flex w-full gap-2">
        {club.isCreator ? (
          <Button variant="secondary" className="flex-1" onClick={onDelete}>
            Excluir clube
          </Button>
        ) : club.joined ? (
          <Button variant="secondary" className="flex-1" onClick={onLeave} disabled={membershipBusy}>
            {membershipBusy ? <Spinner size={18} className="text-paperDim" /> : "Sair do clube"}
          </Button>
        ) : (
          <Button variant="primary" className="flex-1" onClick={onJoin} disabled={membershipBusy}>
            {membershipBusy ? <Spinner size={18} className="text-leather" /> : "Participar do clube"}
          </Button>
        )}
        {club.isCreator && (
          <Button variant="secondary" onClick={onOpenEdit}>
            Editar
          </Button>
        )}
      </div>
    </section>
  );
}
