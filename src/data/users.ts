/** Usuários mocados do feed, cada um com um gradiente de avatar próprio. */
export const MOCK_USERS: Record<string, { gradient: [string, string] }> = {
  "@ana.estante": { gradient: ["#C4472F", "#6E2318"] },
  "@leituras.do.vale": { gradient: ["#5B7553", "#22301F"] },
  "@thriller.gab": { gradient: ["#3E5C76", "#1A2633"] },
  "@pedro_lê": { gradient: ["#D9A441", "#7A4A12"] },
  "@caio_reads": { gradient: ["#7B2D3B", "#2C0F16"] },
  "@rafa.books": { gradient: ["#8E9AAF", "#3B4252"] },
};

/** Quem a usuária logada segue (mock) — usado no filtro "Seguindo" do feed. */
export const FOLLOWED_USERS = ["@ana.estante", "@leituras.do.vale", "@thriller.gab"];

/** Gradientes de avatar disponíveis para o usuário escolher em Editar perfil. */
export const AVATAR_CHOICES: [string, string][] = [
  ["#E4A93C", "#8A5E12"],
  ["#5B7553", "#22301F"],
  ["#C4472F", "#6E2318"],
  ["#3E5C76", "#1A2633"],
  ["#6B4E8E", "#2A1E3D"],
  ["#B85C79", "#4A1F2E"],
];

export function avatarGradient(user: string): [string, string] {
  return MOCK_USERS[user]?.gradient ?? AVATAR_CHOICES[0];
}
