import type { Book } from "@/lib/types";

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
  };
};

function mapVolume(item: GoogleVolume): Book | null {
  const info = item.volumeInfo;
  if (!info?.title) return null;

  const year = info.publishedDate ? parseInt(info.publishedDate.slice(0, 4), 10) : NaN;
  const cover = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail;

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
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Google Books costuma responder 503 "backendFailed" de forma transitória —
 * tenta de novo (com backoff) antes de propagar como erro. */
async function fetchGoogleBooks(url: string): Promise<Response> {
  let lastRes: Response | undefined;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch(url);
    if (res.ok || !RETRYABLE_STATUS.has(res.status)) return res;
    lastRes = res;
    if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS * attempt);
  }
  return lastRes!;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Score simples: título idêntico > começa com > contém a query inteira > resto. */
function relevanceScore(book: Book, q: string): number {
  const title = normalize(book.title);
  const query = normalize(q);
  if (title === query) return 3;
  if (title.startsWith(query)) return 2;
  if (title.includes(query)) return 1;
  return 0;
}

async function runSearch(q: string, extraParams: string): Promise<Book[]> {
  const url = `${GOOGLE_BOOKS_API}?q=${encodeURIComponent(q)}&maxResults=20&country=US&orderBy=relevance${extraParams}&key=${requireApiKey()}`;
  const res = await fetchGoogleBooks(url);
  if (!res.ok) throw new Error(`Google Books search failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { items?: GoogleVolume[] };
  return (data.items ?? []).map(mapVolume).filter((b): b is Book => b !== null);
}

/** As duas buscas rodam em paralelo (evita dobrar a latência do fallback
 * sequencial). `intitle:` tende a vir vazio quando a query é autor/assunto
 * puro — mescla e deduplica por id, o score de relevância decide a ordem. */
export async function searchGoogleBooks(q: string): Promise<Book[]> {
  const [titleBoosted, general] = await Promise.all([
    runSearch(`intitle:${q}`, ""),
    runSearch(q, ""),
  ]);
  const byId = new Map<string, Book>();
  for (const b of [...titleBoosted, ...general]) byId.set(b.id, b);
  return Array.from(byId.values()).sort((a, b) => relevanceScore(b, q) - relevanceScore(a, q));
}

/** `null` quando o volume não existe (404); demais falhas (rede, 5xx, quota)
 * lançam pra virar erro explícito na rota (sem mascarar como "não encontrado"). */
export async function getGoogleBook(id: string): Promise<Book | null> {
  const url = `${GOOGLE_BOOKS_API}/${encodeURIComponent(id)}?country=US&key=${requireApiKey()}`;
  const res = await fetchGoogleBooks(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Google Books get failed: ${res.status} ${await res.text()}`);
  const item = (await res.json()) as GoogleVolume;
  return mapVolume(item);
}
