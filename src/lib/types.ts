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
  /** ISBN-13 (ou ISBN-10 se não houver 13) resolvido do Google Books. */
  isbn?: string;
  /** ISBN-10 normalizado, quando existir. */
  isbn10?: string;
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
  /** Só presente quando a busca foi por raio (lat/lng/radiusKm). */
  distanceKm?: number;
};

/** Item da fila de interessados — só o doador enxerga (GET .../requests). */
export type ApiDonationRequest = {
  id: string;
  status: DonationRequestStatus;
  createdAt: string;
  requester: { id: string; username: string | null; name: string; avatar: number; avatarUrl: string | null };
};

/** Doação do próprio doador (GET /api/donations) — usada no painel de doações do perfil. */
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
  receiverConfirmedAt: string | null;
  /** Início da janela de reserva (RESERVE_EXPIRY_DAYS) — null fora de RESERVADO. */
  reservedAt: string | null;
  /** Interessado ESCOLHIDO atual, se houver — null em DISPONIVEL ou sem ninguém escolhido. */
  chosenReceiver: { id: string; username: string | null; name: string; avatar: number; avatarUrl: string | null } | null;
};

/** Doação em que o usuário logado é o interessado ESCOLHIDO (GET /api/donations/received) —
 * usada no painel de doações do perfil. Contato do doador só vem preenchido enquanto RESERVADO. */
export type ApiReceivedDonation = {
  requestId: string;
  donationId: string;
  bookId: string;
  bookTitle: string;
  authors: string;
  photoUrl: string;
  city: string;
  state: string;
  status: DonationStatus;
  /** Quando o pedido foi feito — usada só pra ordenar o painel junto com ApiMyDonation. */
  createdAt: string;
  donatedAt: string | null;
  receiverConfirmedAt: string | null;
  reservedAt: string | null;
  contact: { whatsapp: string | null; instagram: string | null } | null;
  donor: { id: string; username: string | null; name: string; avatar: number; avatarUrl: string | null };
};

/** Item da fila de interessados dentro de GET /api/donations/[id] — só vem
 * preenchido pro doador (mesmo shape de ApiDonationRequest). */
export type ApiDonationDetailRequest = ApiDonationRequest;

/** Entrada da linha do tempo de GET /api/donations/[id] — ver
 * lib/donation-state (buildDonationTimeline) pra como é montada. */
export type ApiDonationTimelineEntry = {
  key: string;
  type: NotificationType | "ANUNCIADA";
  actor: { id: string; username: string | null; name: string; avatar: number; avatarUrl: string | null } | null;
  createdAt: string;
  sentence: string;
};

/** GET /api/donations/[id] — tudo que a tela de negociação precisa numa
 * chamada só: a doação, o papel do viewer, a fila (só pro doador), o
 * contato liberado (doador ou escolhido) e a linha do tempo. */
export type ApiDonationDetail = {
  id: string;
  bookId: string;
  book: { id: string; title: string; authors: string };
  photoUrl: string;
  city: string;
  state: string;
  status: DonationStatus;
  createdAt: string;
  donatedAt: string | null;
  receiverConfirmedAt: string | null;
  reservedAt: string | null;
  donor: { id: string; username: string | null; name: string; avatar: number; avatarUrl: string | null };
  myRole: "donor" | "receiver" | "requester";
  myRequest: { id: string; status: DonationRequestStatus } | null;
  contact: { whatsapp: string | null; instagram: string | null } | null;
  /** Do ponto de vista do viewer: pro doador, o interessado ESCOLHIDO (ou
   * null se ainda não há um); pra recebedor/interessado, o doador. */
  counterpart: { id: string; username: string | null; name: string; avatar: number; avatarUrl: string | null } | null;
  /** Só presente quando o viewer é o doador — fila de PENDENTE, mais antigos primeiro. */
  requests?: ApiDonationDetailRequest[];
  timeline: ApiDonationTimelineEntry[];
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
  /** Derivado do livro do mês corrente (ClubBookOfMonth) — null se o clube
   * ainda não tem um definido. */
  bookId: string | null;
  book: Book | null;
  members: number;
  joined: boolean;
  visibility: Visibility;
  progress: number;
};

export type ClubDetail = {
  id: string;
  name: string;
  desc: string;
  /** Derivado do livro do mês corrente (ClubBookOfMonth) — null se o clube
   * ainda não tem um definido. */
  bookId: string | null;
  book: Book | null;
  visibility: Visibility;
  joined: boolean;
  isCreator: boolean;
  /** Só presente quando o viewer é o criador de um clube privado. */
  code?: string | null;
  members: ClubMember[];
  progress: number;
};

/** Streak semanal de leitura de cada membro — GET /api/clubs/[id]/streaks.
 * Atividade de leitura em geral do usuário, não só do livro do clube. */
export type ApiClubStreaks = { streaks: { userId: string; streak: number }[] };

/** Livro do mês de um clube — GET/PUT /api/clubs/[id]/book-of-month. */
export type ApiClubBookOfMonth = {
  id: string;
  month: string;
  book: Book;
  setBy: string;
  createdAt: string;
};

export type ApiClubBookOfMonthDetail = {
  bookOfMonth: ApiClubBookOfMonth | null;
  totalMembers: number;
  started: number;
  finished: number;
  /** Estante do viewer pro livro do mês; null se ainda não adicionou. */
  mine: { status: ShelfStatus; currentPage: number | null } | null;
};

/** Item de `?history=1` — sem agregação, só o registro histórico. */
export type ApiClubBookOfMonthHistoryItem = {
  month: string;
  book: Book;
  setBy: string;
  createdAt: string;
};

/** Membro nomeado em GET .../book-of-month/members — só quem já começou
 * a ler (terminou ou lendo); quem não começou entra só em `notStartedCount`. */
export type ApiBookOfMonthMember = {
  userId: string;
  user: string;
  name: string;
  avatar: number;
  avatarUrl?: string | null;
  currentPage: number | null;
  percent: number;
};

/** Progresso comparado dos membros no livro do mês — GET
 * /api/clubs/[id]/book-of-month/members. */
export type ApiBookOfMonthMembers = {
  finished: ApiBookOfMonthMember[];
  reading: ApiBookOfMonthMember[];
  notStartedCount: number;
  totalMembers: number;
};

/** Comentário na discussão do livro do mês — só chega no payload se o
 * viewer já leu até `page` (filtro no servidor). */
export type ApiClubDiscussionComment = {
  id: string;
  content: string;
  page: number;
  createdAt: string;
  author: { user: string; name: string; avatar: number; avatarUrl?: string | null };
};

/** GET /api/clubs/[id]/discussion. `lockedCount` é `undefined` quando o
 * viewer não tem estante pro livro (área vira CTA, sem número). */
export type ApiClubDiscussion = {
  bookOfMonthId: string;
  bookId: string;
  mine: { status: ShelfStatus; currentPage: number | null } | null;
  comments: ApiClubDiscussionComment[];
  lockedCount?: number;
};

export type ShelfStatus = "WANT_TO_READ" | "READING" | "READ" | "DNF";

export type ShelfEntry = {
  status: ShelfStatus;
  currentPage?: number | null;
  lastPage?: number | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  abandonedAt?: string | null;
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

export type FeedEventType =
  | "REVIEW"
  | "BOOK_FINISHED"
  | "DONATION_CREATED"
  | "CLUB_JOINED"
  | "HIGHLIGHT"
  | "CLUB_BOOK_OF_MONTH_SET";

/** Evento do feed unificado (stream) — GET /api/feed com scope=all|following.
 * Só o campo correspondente a `type` vem populado (os outros, undefined). */
export type ApiFeedEvent = {
  id: string;
  type: FeedEventType;
  user: ApiAuthor;
  createdAt: string;
  book?: Book;
  /** `book` já vem no nível do evento — não repetido aqui. */
  review?: Omit<ApiUserReview, "book">;
  donation?: { id: string; photoUrl: string; city: string; state: string };
  club?: { id: string; name: string };
  highlight?: { id: string; text: string; page?: number };
};

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

export type NotificationType =
  | "DONATION_REQUEST_RECEIVED"
  | "DONATION_CHOSEN"
  | "DONATION_COMPLETED"
  | "DONATION_RESERVE_EXPIRING"
  | "DONATION_RESERVE_EXPIRED"
  | "DONATION_RECEIPT_CONFIRMED"
  | "DONATION_RESERVE_EXTENDED";

/** Item da lista de GET /api/notifications — já vem agrupado pelo servidor
 * (mesmo tipo + mesma doação, entre não lidas; ver lib/notification-grouping
 * no backend). `actors` tem 1 item pra notificações não agrupadas e mais de
 * 1 quando várias pessoas geraram notificações pro mesmo alvo. */
export type ApiNotificationGroup = {
  key: string;
  type: NotificationType;
  donationId: string | null;
  read: boolean;
  createdAt: string;
  actors: { id: string; username: string | null; name: string; avatar: number; avatarUrl: string | null }[];
  donation: { id: string; bookId: string; book: { title: string } } | null;
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
  /** Localização do usuário (opcional) — default do filtro de doações e
   * pré-preenchimento do formulário de criar doação. */
  city?: string | null;
  state?: string | null;
};
