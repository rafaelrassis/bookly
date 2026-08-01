import { LockIcon } from "@/components/icons";
import { Spinner } from "@/components/Spinner";
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
      <p className="mt-2 max-w-72 text-sm text-paperDim">{club.desc}</p>

      <div className="mt-5 flex w-full gap-2">
        {club.isCreator ? (
          <button
            type="button"
            onClick={onDelete}
            className="flex-1 rounded-xl border border-line bg-card px-5 py-3 font-bold text-paperDim transition-colors hover:text-ribbonText"
          >
            Excluir clube
          </button>
        ) : club.joined ? (
          <button
            type="button"
            onClick={onLeave}
            disabled={membershipBusy}
            className="flex flex-1 items-center justify-center rounded-xl border border-line bg-card px-5 py-3 font-bold text-paperDim transition-colors hover:text-paper disabled:opacity-60"
          >
            {membershipBusy ? <Spinner size={18} className="text-paperDim" /> : "Sair do clube"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onJoin}
            disabled={membershipBusy}
            className="flex flex-1 items-center justify-center rounded-xl bg-foil px-5 py-3 font-bold text-leather transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {membershipBusy ? <Spinner size={18} className="text-leather" /> : "Participar do clube"}
          </button>
        )}
        {club.isCreator && (
          <button
            type="button"
            onClick={onOpenEdit}
            className="rounded-xl border border-line bg-card px-4 py-3 font-bold text-paper transition-colors hover:bg-card2"
          >
            Editar
          </button>
        )}
      </div>
    </section>
  );
}
