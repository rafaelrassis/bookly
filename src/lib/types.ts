export type Book = {
  id: string;
  title: string;
  authors: string;
  year: number;
  pages: number;
  genre: string;
  gradient: [string, string];
  avg: number;
  count: number;
  synopsis: string;
  /** Capa real (Google Books); ausente nos livros do catálogo semeado, que usam o gradiente. */
  coverUrl?: string;
  /** true quando há doação DISPONIVEL deste livro — selo na busca/estante. */
  hasDonation?: boolean;
};

export type DonationStatus = "DISPONIVEL" | "RESERVADO" | "DOADO";
export type DonationRequestStatus = "PENDENTE" | "ESCOLHIDO" | "RECUSADO";

/** Doação de um exemplar físico do livro — ver GET /api/books/[id]/donations. */
export type ApiDonation = {
  id: string;
  bookId: string;
  donorId: string;
  photoUrl: string;
  city: string;
  state: string;
  status: DonationStatus;
  createdAt: string;
  isDonor: boolean;
  requestCount: number;
  myRequest: { id: string; status: DonationRequestStatus } | null;
  /** Só presente pro doador ou pro interessado ESCOLHIDO. */
  contact: { whatsapp: string | null; instagram: string | null } | null;
};

/** Item da fila de interessados — só o doador enxerga (GET .../requests). */
export type ApiDonationRequest = {
  id: string;
  status: DonationRequestStatus;
  createdAt: string;
  requester: { id: string; username: string | null; name: string; avatar: number; avatarUrl: string | null };
};

/** Doação do próprio doador (GET /api/donations) — usada em "Minhas doações". */
export type ApiMyDonation = {
  id: string;
  bookId: string;
  bookTitle: string;
  authors: string;
  photoUrl: string;
  city: string;
  state: string;
  status: DonationStatus;
  pendingRequests: number;
  createdAt: string;
  donatedAt: string | null;
};

/** Lista pública de um usuário da comunidade, exibida na busca sem query. */
export type ApiCommunityList = {
  id: string;
  name: string;
  by: string;
  bookIds: string[];
  books: Book[];
};

export type Visibility = "public" | "private";

export type ClubMessage = {
  id: string;
  user: string;
  name: string;
  avatar: number;
  avatarUrl?: string | null;
  text: string;
  time: string;
  system?: boolean;
  replyTo?: { user: string; text: string } | null;
};

export type ClubMember = {
  userId: string;
  user: string;
  name: string;
  avatar: number;
  avatarUrl?: string | null;
  role: string;
  percent: number;
};

export type ClubSummary = {
  id: string;
  name: string;
  desc: string;
  bookId: string;
  book: Book;
  members: number;
  joined: boolean;
  visibility: Visibility;
  progress: number;
};

export type ClubDetail = {
  id: string;
  name: string;
  desc: string;
  bookId: string;
  book: Book;
  visibility: Visibility;
  joined: boolean;
  isCreator: boolean;
  /** Só presente quando o viewer é o criador de um clube privado. */
  code?: string | null;
  members: ClubMember[];
  progress: number;
};

export type ShelfStatus = "WANT_TO_READ" | "READING" | "READ";

export type ShelfEntry = {
  status: ShelfStatus;
  currentPage?: number | null;
  lastPage?: number | null;
  startedAt?: string | null;
  finishedAt?: string | null;
};

export type ProgressUnit = "pages" | "percent";

/** Autor mínimo retornado pelas APIs sociais (feed/comentários/listas). */
export type ApiAuthor = { username: string; name: string; avatar: number; avatarUrl?: string | null };

/** Review real (Spec 3b) — usada no feed, na página de review e nas reviews do livro. */
export type ApiReview = {
  id: string;
  user: ApiAuthor;
  book: Book;
  rating: number;
  title?: string;
  text: string;
  startedAt?: string;
  finishedAt?: string;
  likes: number;
  comments: number;
  likedByMe: boolean;
  createdAt: string;
};

/** Review de `GET /api/books/[id]/reviews` — mesmo shape sem o campo `book` (já conhecido). */
export type ApiBookReview = Omit<ApiReview, "book">;

/** Review de `GET /api/users/[username]/reviews` — sem o campo `user` (já conhecido). */
export type ApiUserReview = Omit<ApiReview, "user">;

export type ApiComment = {
  id: string;
  text: string;
  createdAt: string;
  user: ApiAuthor;
};

export type ApiList = {
  id: string;
  name: string;
  visibility: Visibility;
  bookIds: string[];
  books: Book[];
  /** Username do dono (sem @) — só presente em `GET /api/lists?community=true`. */
  by?: string;
  /** true se o usuário autenticado é o dono da lista. */
  isOwner?: boolean;
};

export type Notification = {
  id: string;
  kind: "like" | "comment" | "follow";
  actor: string;
  reviewId?: string;
  bookId?: string;
  text?: string;
  time: string;
};

export type UserState = {
  loggedIn: boolean;
  name: string;
  username: string;
  email: string;
  bio: string;
  genres: string[];
  followers: number;
  following: number;
  top4: string[];
  /** Livros resolvidos de `top4` (mesma ordem), vindos de /api/users/me. */
  top4Books: Book[];
  /** Índice do gradiente de avatar escolhido (AVATAR_CHOICES); usado como fallback quando avatarUrl não está definido. */
  avatar: number;
  /** Foto de perfil enviada pelo usuário (Vercel Blob); sobrepõe o gradiente quando presente. */
  avatarUrl?: string | null;
  progressUnit: ProgressUnit;
};
