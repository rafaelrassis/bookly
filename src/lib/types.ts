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

export type UserList = {
  id: string;
  name: string;
  visibility: Visibility;
  bookIds: string[];
};

export type ProgressUnit = "pages" | "percent";

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
  likedReviews: Record<string, boolean>;
  bookTags: Record<string, string[]>;
  quotes: Record<string, Quote[]>;
  lists: UserList[];
};
