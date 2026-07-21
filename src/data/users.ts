/** Usuários mocados do feed, cada um com gradiente de avatar e dados de perfil público. */
export const MOCK_USERS: Record<
  string,
  {
    gradient: [string, string];
    name: string;
    bio: string;
    reading: string[];
    followers: number;
    following: number;
  }
> = {
  "@ana.estante": {
    gradient: ["#C4472F", "#6E2318"],
    name: "Ana",
    bio: "Literatura brasileira e um chá sempre por perto.",
    reading: ["torto-arado", "1984"],
    followers: 312,
    following: 148,
  },
  "@leituras.do.vale": {
    gradient: ["#5B7553", "#22301F"],
    name: "Vale",
    bio: "Fantasia épica e maratonas de leitura no fim de semana.",
    reading: ["o-nome-do-vento", "duna"],
    followers: 259,
    following: 96,
  },
  "@thriller.gab": {
    gradient: ["#3E5C76", "#1A2633"],
    name: "Gabriel",
    bio: "Se tem plot twist, eu já li. Suspense é vício.",
    reading: ["a-paciente-silenciosa", "verity"],
    followers: 204,
    following: 173,
  },
  "@pedro_lê": {
    gradient: ["#D9A441", "#7A4A12"],
    name: "Pedro",
    bio: "Distopias, ensaios e café preto.",
    reading: ["1984", "duna"],
    followers: 88,
    following: 120,
  },
  "@caio_reads": {
    gradient: ["#7B2D3B", "#2C0F16"],
    name: "Caio",
    bio: "Construção de mundo é minha praia.",
    reading: ["duna", "torto-arado"],
    followers: 141,
    following: 200,
  },
  "@rafa.books": {
    gradient: ["#8E9AAF", "#3B4252"],
    name: "Rafa",
    bio: "Leio de tudo, julgo tudo com meia estrela de precisão.",
    reading: ["verity", "a-paciente-silenciosa"],
    followers: 167,
    following: 155,
  },
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
