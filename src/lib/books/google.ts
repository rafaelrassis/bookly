import type { Book } from "@/lib/types";
import { normalizeIsbn, isbn10to13 } from "./isbn";

const GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes";

/** Paleta do catálogo semeado (prisma/seed-data.ts) — reaproveitada como fallback
 * visual determinístico pra livros do Google sem capa (imageLinks ausente). */
const GRADIENTS: [string, string][] = [
  ["#5B7553", "#1E2B1A"],
  ["#C96F2F", "#54250B"],
  ["#3E5C76", "#141F2C"],
  ["#D9A441", "#6E3E0E"],
  ["#8E9AAF", "#333B4D"],
  ["#7B2D3B", "#250C12"],
  ["#A63A3A", "#1C1C1E"],
  ["#CFC9BC", "#615B4F"],
];

function gradientFor(id: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

type GoogleVolume = {
  id: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publishedDate?: string;
    pageCount?: number;
    categories?: string[];
    averageRating?: number;
    ratingsCount?: number;
    description?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    industryIdentifiers?: { type?: string; identifier?: string }[];
  };
};

function mapVolume(item: GoogleVolume): Book | null {
  const info = item.volumeInfo;
  if (!info?.title) return null;

  const year = info.publishedDate ? parseInt(info.publishedDate.slice(0, 4), 10) : NaN;
  const cover = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail;

  const ids = info.industryIdentifiers ?? [];
  const isbn13 = ids.find((i) => i.type === "ISBN_13")?.identifier;
  const isbn10raw = ids.find((i) => i.type === "ISBN_10")?.identifier;
  const isbn10 = isbn10raw ? normalizeIsbn(isbn10raw) : undefined;
  const isbn = isbn13 ? normalizeIsbn(isbn13) : (isbn10 ? isbn10to13(isbn10) ?? undefined : undefined);

  return {
    id: item.id,
    title: info.subtitle ? `${info.title}: ${info.subtitle}` : info.title,
    authors: info.authors?.join(", ") || "Autor desconhecido",
    year: Number.isFinite(year) ? year : 0,
    pages: info.pageCount ?? 0,
    genre: info.categories?.[0] ?? "Geral",
    gradient: gradientFor(item.id),
    avg: info.averageRating ?? 0,
    count: info.ratingsCount ?? 0,
    synopsis: info.description ?? "",
    coverUrl: cover ? cover.replace(/^http:/, "https:") : undefined,
    isbn,
    isbn10,
  };
}

/** Lança se a key não estiver configurada — preferimos falhar visível
 * (502 na rota) a chamar o Google sem key e cair num limite por IP. */
function requireApiKey(): string {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  if (!key) throw new Error("GOOGLE_BOOKS_API_KEY não configurada");
  return key;
}

const RETRYABLE_STATUS = new Set([429, 500, 503]);
const RETRY_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Google Books costuma responder 503 "backendFailed" de forma transitória —
 * tenta de novo (com backoff) antes de propagar como erro.
 * `maxAttempts` menor na busca (2) que no detalhe (3): a busca já dispara
 * 2 chamadas em paralelo, então cada retry pesa mais na latência percebida. */
async function fetchGoogleBooks(url: string, maxAttempts = 3): Promise<Response> {
  let lastRes: Response | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url);
    if (res.ok || !RETRYABLE_STATUS.has(res.status)) return res;
    lastRes = res;
    if (attempt < maxAttempts) await sleep(RETRY_DELAY_MS * attempt);
  }
  return lastRes!;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const STOPWORDS = new Set([
  "a","o","as","os","de","da","do","das","dos","e","em","para","por","com",
  "um","uma","uns","umas","no","na","nos","nas","que","tem","quem","ao","aos",
  "the","of","and","to","in","for",
]);

function tokens(text: string): string[] {
  return normalize(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Tokens "fortes" da query: sem stopwords e com mais de 2 letras.
 * Cai nos tokens crus quando a query inteira é composta de stopwords. */
function strongTokens(q: string): string[] {
  const all = tokens(q);
  const strong = all.filter((t) => !STOPWORDS.has(t) && t.length > 2);
  return strong.length > 0 ? strong : all;
}

/**
 * Score de relevância (0 a ~2.5):
 *  - base: fração dos tokens fortes da query presentes no título
 *  - +1.0 quando o título contém a frase inteira da query
 *  - +0.5 quando o título cobre todos os tokens fortes
 *  - +0.3 quando os tokens aparecem no autor (busca por autor)
 */
export function relevanceScore(book: Book, q: string): number {
  const ref = strongTokens(q);
  const titleTokens = new Set(tokens(book.title));
  const authorTokens = new Set(tokens(book.authors));

  const hits = ref.filter((t) => titleTokens.has(t)).length;
  let score = hits / ref.length;

  if (normalize(book.title).includes(normalize(q))) score += 1;
  if (ref.every((t) => titleTokens.has(t))) score += 0.5;
  if (ref.every((t) => authorTokens.has(t))) score += 0.3;

  return score;
}

/** Chave de obra: título + primeiro autor, normalizados e sem pontuação.
 * Colapsa edições diferentes do mesmo livro (que têm ids distintos). */
function workKey(b: Book): string {
  const title = normalize(b.title).replace(/[^a-z0-9]/g, "");
  const author = normalize(b.authors.split(",")[0] ?? "").replace(/[^a-z0-9]/g, "");
  return `${title}|${author}`;
}

/** Mantém a melhor edição de cada obra: mais avaliações > tem capa > tem sinopse. */
export function dedupeByWork(books: Book[]): Book[] {
  const best = new Map<string, Book>();
  for (const b of books) {
    const k = workKey(b);
    const cur = best.get(k);
    if (!cur) {
      best.set(k, b);
      continue;
    }
    const better =
      b.count - cur.count ||
      Number(Boolean(b.coverUrl)) - Number(Boolean(cur.coverUrl)) ||
      Number(Boolean(b.synopsis)) - Number(Boolean(cur.synopsis));
    if (better > 0) best.set(k, b);
  }
  return Array.from(best.values());
}

async function runSearch(q: string, extraParams: string, maxAttempts?: number): Promise<Book[]> {
  const url = `${GOOGLE_BOOKS_API}?q=${encodeURIComponent(q)}&maxResults=20&country=BR&printType=books&langRestrict=pt&orderBy=relevance${extraParams}&key=${requireApiKey()}`;
  const res = await fetchGoogleBooks(url, maxAttempts);
  if (!res.ok) throw new Error(`Google Books search failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { items?: GoogleVolume[] };
  return (data.items ?? []).map(mapVolume).filter((b): b is Book => b !== null);
}

export type SearchResult = { books: Book[]; more: Book[] };

/** Acima deste score consideramos "match forte de título" e ativamos o corte. */
const STRONG_MATCH = 1;
/** Piso para permanecer na lista principal quando há match forte. */
const KEEP_THRESHOLD = 0.6;

const SEARCH_CACHE_TTL_MS = 5 * 60_000;
const searchCache = new Map<string, { at: number; result: SearchResult }>();

/** Cache in-memory por instância (best-effort — não sobrevive a cold start
 * nem é compartilhado entre instâncias serverless). Reduz custo de quota e
 * latência pra termos populares repetidos, sem precisar de infra externa. */
function cacheKey(q: string): string {
  return normalize(q.trim());
}

/** As três buscas rodam em paralelo (evita somar latência de fallback
 * sequencial). `intitle:"frase"` costuma vir vazio para query de autor/assunto;
 * a busca por tokens de título cobre o caso do artigo inicial ("A história
 * do..."), e a geral é a rede de segurança. Mescla e deduplica por id, depois
 * por obra — o score de relevância decide ordem e corte. */
export async function searchGoogleBooks(q: string): Promise<SearchResult> {
  const key = cacheKey(q);
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.at < SEARCH_CACHE_TTL_MS) return cached.result;

  const core = strongTokens(q);
  const [phrase, byTitleTokens, general] = await Promise.all([
    runSearch(`intitle:"${q}"`, "", 2),
    runSearch(core.map((t) => `intitle:${t}`).join(" "), "", 2),
    runSearch(q, "", 2),
  ]);

  const byId = new Map<string, Book>();
  for (const b of [...phrase, ...byTitleTokens, ...general]) {
    if (!byId.has(b.id)) byId.set(b.id, b);
  }

  const scored = dedupeByWork(Array.from(byId.values()))
    .map((b) => ({ b, s: relevanceScore(b, q) }))
    .sort((x, y) => y.s - x.s || y.b.count - x.b.count);

  const best = scored[0]?.s ?? 0;
  const strong = best >= STRONG_MATCH;

  const result: SearchResult = {
    books: (strong ? scored.filter((x) => x.s >= KEEP_THRESHOLD) : scored).map((x) => x.b),
    more: (strong ? scored.filter((x) => x.s < KEEP_THRESHOLD) : []).map((x) => x.b),
  };

  searchCache.set(key, { at: Date.now(), result });
  return result;
}

/** Busca exata por ISBN (fallback quando o catálogo local não tem o livro). */
export async function searchGoogleByIsbn(isbn: string): Promise<Book[]> {
  return runSearch(`isbn:${normalizeIsbn(isbn)}`, "", 2);
}

/** `null` quando o volume não existe (404); demais falhas (rede, 5xx, quota)
 * lançam pra virar erro explícito na rota (sem mascarar como "não encontrado"). */
export async function getGoogleBook(id: string): Promise<Book | null> {
  const url = `${GOOGLE_BOOKS_API}/${encodeURIComponent(id)}?country=BR&key=${requireApiKey()}`;
  const res = await fetchGoogleBooks(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Google Books get failed: ${res.status} ${await res.text()}`);
  const item = (await res.json()) as GoogleVolume;
  return mapVolume(item);
}
