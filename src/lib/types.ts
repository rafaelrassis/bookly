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
};

export type FeedReview = {
  id: string;
  user: string;
  bookId: string;
  rating: number;
  title?: string;
  text: string;
  startedAt?: string;
  finishedAt?: string;
  likes: number;
  comments: { user: string; text: string }[];
};

export type CommunityList = {
  name: string;
  by: string;
  bookIds: string[];
};

export type Visibility = "public" | "private";

export type ClubMessage = {
  id: string;
  user: string;
  text: string;
  time: string;
  system?: boolean;
  replyTo?: { user: string; text: string };
};

export type Club = {
  id: string;
  name: string;
  bookId: string;
  members: number;
  joined: boolean;
  desc: string;
  visibility: Visibility;
  /** Código de acesso (somente clubes privados). */
  code?: string;
  feed: ClubMessage[];
  /** Progresso mocado dos outros membros (0–100). */
  memberProgress: Record<string, number>;
  /** Username (com @) de quem criou o clube. */
  creator: string;
};

export type ShelfStatus = "WANT_TO_READ" | "READING" | "READ";

export type ShelfEntry = {
  status: ShelfStatus;
  currentPage?: number;
  lastPage?: number;
  startedAt?: string;
  finishedAt?: string;
};

export type Quote = { text: string; page?: number };

export type ProgressUnit = "pages" | "percent";

/** Autor mínimo retornado pelas APIs sociais (feed/comentários/listas). */
export type ApiAuthor = { username: string; name: string; avatar: number };

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
};

export type Notification = {
  id: string;
  kind: "like" | "comment" | "follow";
  actor: string;
  reviewId?: string;
  bookId?: string;
  text?: string;
  read: boolean;
  time: string;
};

export type UserState = {
  loggedIn: boolean;
  name: string;
  username: string;
  email: string;
  /** Telefone no formato exibido; ausente até o usuário adicionar um. */
  phone?: string;
  bio: string;
  genres: string[];
  followers: number;
  following: number;
  top4: string[];
  /** Índice do gradiente de avatar escolhido (AVATAR_CHOICES). */
  avatar: number;
  /** Foto de perfil enviada pelo usuário (data URL); sobrepõe o gradiente quando presente. */
  avatarImage?: string;
  progressUnit: ProgressUnit;
  shelf: Record<string, ShelfEntry>;
  ratings: Record<string, number>;
  ratingOrder: string[];
  myReviews: Record<string, string>;
  myReviewTitles: Record<string, string>;
  bookTags: Record<string, string[]>;
  quotes: Record<string, Quote[]>;
};
