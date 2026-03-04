import { apiClient } from "@/lib/api-client";
import type { Book } from "@/types/api";

/**
 * 外部検索結果の書籍をDBに登録してIDを返す。
 * 既にDB登録済み（idあり）の場合はそのまま返す。
 */
export async function registerBookIfNeeded(book: Book): Promise<string> {
  if (book.id) return book.id;

  const res = await apiClient.post<{ data: Book }>("/books/register", {
    isbn_10: book.isbn_10,
    isbn_13: book.isbn_13,
    title: book.title,
    subtitle: book.subtitle,
    authors: book.authors,
    publisher: book.publisher,
    published_date: book.published_date,
    description: book.description,
    page_count: book.page_count,
    cover_image_url: book.cover_image_url,
    categories: book.categories,
    language: book.language,
    source: book.source,
  });
  return res.data.id;
}
