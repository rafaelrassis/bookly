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
  name: string;
  avatar: number;
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

export type UserList = {
  id: string;
  name: string;
  visibility: Visibility;
  bookIds: string[];
};

export type ProgressUnit = "pages" | "percent";

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
  likedReviews: Record<string, boolean>;
  lists: UserList[];
};
