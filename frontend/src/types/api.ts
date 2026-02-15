// Pagination
export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// User
export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  locale: string;
  role: "user" | "admin";
  is_active: boolean;
  is_profile_public: boolean;
  created_at: string;
}

// Book
export interface Book {
  id: string;
  isbn_10: string | null;
  isbn_13: string | null;
  title: string;
  subtitle: string | null;
  series_title: string | null;
  volume_number: string | null;
  authors: string[];
  publisher: string | null;
  published_date: string | null;
  description: string | null;
  page_count: number | null;
  cover_image_url: string | null;
  categories: string[];
  language: string | null;
  source: string;
  is_custom: boolean;
}

// UserBook
export type BookStatus =
  | "want_to_read"
  | "unread"
  | "tsundoku"
  | "reading"
  | "suspended"
  | "finished";

export interface UserBook {
  id: string;
  book: Book;
  status: BookStatus;
  rating: number | null;
  private_memo: string | null;
  is_owned: boolean;
  purchase_price: number | null;
  started_reading_at: string | null;
  finished_reading_at: string | null;
  tags: Tag[];
  created_at: string;
  updated_at: string;
}

// Reading Log
export interface ReadingLog {
  id: string;
  book_id: string;
  read_date: string;
  pages_read: number | null;
  minutes_read: number | null;
  note: string | null;
  created_at: string;
}

export interface HeatmapData {
  [date: string]: {
    count: number;
    total_pages: number;
  };
}

// Review
export interface Review {
  id: string;
  user_id: string;
  book_id: string;
  title: string;
  body: string;
  is_public: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// Playlist
export interface Playlist {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  share_slug: string | null;
  ogp_image_path: string | null;
  items: PlaylistItem[];
  created_at: string;
  updated_at: string;
}

export interface PlaylistItem {
  id: string;
  book: Book;
  position: number;
}

// Tag
export interface Tag {
  id: string;
  name: string;
}

// Auth
export interface LoginRequest {
  email: string;
  password: string;
  turnstile_token: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  display_name: string;
  password: string;
  turnstile_token: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

// Task status (for async operations)
export interface TaskStatus {
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  total: number;
  errors: string[];
}
