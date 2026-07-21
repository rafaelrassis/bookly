/** Gancho de clube ao atualizar progresso — no-op até a Spec 4 trazer os
 * modelos Club/Message (mensagem de sistema "fulano avançou para X%"). */
export async function publishProgressToClubs(userId: string, bookId: string, percent: number) {
  void userId;
  void bookId;
  void percent;
}
