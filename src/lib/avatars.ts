/** Gradientes de avatar disponíveis para o usuário escolher em Editar perfil. */
export const AVATAR_CHOICES: [string, string][] = [
  ["#E4A93C", "#8A5E12"],
  ["#5B7553", "#22301F"],
  ["#C4472F", "#6E2318"],
  ["#3E5C76", "#1A2633"],
  ["#6B4E8E", "#2A1E3D"],
  ["#B85C79", "#4A1F2E"],
];

/** Índice determinístico em AVATAR_CHOICES a partir do handle, para exibir
 * um gradiente estável quando o avatar real (int salvo no perfil) não está
 * disponível no contexto (ex.: notificações). */
export function hashAvatarIndex(user: string): number {
  let hash = 0;
  for (let i = 0; i < user.length; i++) {
    hash = (hash * 31 + user.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % AVATAR_CHOICES.length;
}
