import { ClubBookOfMonthCard } from "@/components/ClubBookOfMonthCard";
import { ClubDiscussionCard } from "@/components/ClubDiscussionCard";

type Props = {
  clubId: string;
  isCreator: boolean;
  joined: boolean;
};

/** Livro do mês + a discussão travada por progresso de leitura sobre ele. */
export function BookOfMonthSection({ clubId, isCreator, joined }: Props) {
  return (
    <>
      <ClubBookOfMonthCard clubId={clubId} isCreator={isCreator} />
      {joined && <ClubDiscussionCard clubId={clubId} />}
    </>
  );
}
