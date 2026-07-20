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
  text: string;
  likes: number;
  comments: { user: string; text: string }[];
};

export type CommunityList = {
  name: string;
  by: string;
  bookIds: string[];
};

export type Club = {
  id: string;
  name: string;
  bookId: string;
  members: number;
  joined: boolean;
  desc: string;
  feed: { user: string; text: string }[];
};

export type ShelfStatus = "WANT_TO_READ" | "READING" | "READ";

export type ShelfEntry = {
  status: ShelfStatus;
  currentPage?: number;
  lastPage?: number;
};

export type Quote = { text: string; page?: number };

export type UserState = {
  loggedIn: boolean;
  name: string;
  username: string;
  bio: string;
  genres: string[];
  followers: number;
  following: number;
  top4: string[];
  shelf: Record<string, ShelfEntry>;
  ratings: Record<string, number>;
  ratingOrder: string[];
  myReviews: Record<string, string>;
  likedReviews: Record<string, boolean>;
  bookTags: Record<string, string[]>;
  quotes: Record<string, Quote[]>;
};
