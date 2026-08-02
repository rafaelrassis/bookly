/** Categorias cruas do Google Books (en) → taxonomia canônica do app (pt-BR).
 * Chaves em lowercase; match por `includes` na ordem declarada (mais
 * específico primeiro). Categoria sem match cai em "Não ficção" ou "Geral"
 * conforme heurística abaixo. */
const GENRE_RULES: [string, string][] = [
  ["self-help", "Autoajuda"],
  ["body, mind & spirit", "Autoajuda"],
  ["young adult", "Young Adult"],
  ["juvenile fiction", "Young Adult"],
  ["poetry", "Poesia"],
  ["science fiction", "Ficção científica"],
  ["fantasy", "Fantasia"],
  ["horror", "Terror"],
  ["thriller", "Thriller"],
  ["suspense", "Thriller"],
  ["mystery", "Thriller"],
  ["romance", "Romance"],
  ["classics", "Clássicos"],
  ["biography", "Não ficção"],
  ["history", "Não ficção"],
  ["business", "Não ficção"],
  ["philosophy", "Não ficção"],
  ["psychology", "Não ficção"],
  ["science", "Não ficção"],
  ["fiction", "Ficção"],
];

/** Normaliza uma categoria crua do Google Books pro vocabulário do app.
 * Sem match → "Geral" (fallback já usado hoje). */
export function normalizeGenre(rawCategory: string | undefined | null): string {
  if (!rawCategory) return "Geral";
  const lower = rawCategory.toLowerCase();
  for (const [needle, mapped] of GENRE_RULES) {
    if (lower.includes(needle)) return mapped;
  }
  return "Geral";
}
