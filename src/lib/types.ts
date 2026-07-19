export type CommunityReview = {
  user: string;
  rating: number;
  text: string;
};

export type Book = {
  id: string;
  title: string;
  authors: string;
  year: number;
  pages: number;
  gradient: [string, string];
  avg: number;
  count: number;
  synopsis: string;
  reviews: CommunityReview[];
};

export type ShelfStatus = "WANT_TO_READ" | "READING" | "READ";

export type ShelfEntry = {
  status: ShelfStatus;
  currentPage?: number;
};

export type UserState = {
  loggedIn: boolean;
  name: string;
  username: string;
  genres: string[];
  shelf: Record<string, ShelfEntry>;
  ratings: Record<string, number>;
  myReviews: Record<string, string>;
};
