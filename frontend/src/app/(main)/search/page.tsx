"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiClient, ApiRequestError } from "@/lib/api-client";
import type { Book, BookStatus } from "@/types/api";

const STATUS_OPTIONS: { value: BookStatus; label: string }[] = [
  { value: "want_to_read", label: "読みたい" },
  { value: "unread", label: "未読" },
  { value: "tsundoku", label: "積読" },
  { value: "reading", label: "読書中" },
  { value: "finished", label: "読了" },
];

interface BookSearchResponse {
  data: Book[];
  meta: { page: number; per_page: number; total: number; total_pages: number };
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSource, setSearchSource] = useState<
    "all" | "internal" | "external"
  >("all");
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Add to shelf dialog
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [addStatus, setAddStatus] = useState<BookStatus>("want_to_read");
  const [addingBookId, setAddingBookId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  const performSearch = useCallback(
    async (query: string, source: string) => {
      if (!query.trim()) return;

      setSearching(true);
      setSearchError(null);
      setHasSearched(true);

      try {
        const params = new URLSearchParams({
          q: query.trim(),
          source,
          per_page: "20",
        });
        const res = await apiClient.get<BookSearchResponse>(
          `/books/search?${params.toString()}`
        );
        setSearchResults(res.data);
      } catch (err) {
        if (err instanceof ApiRequestError) {
          setSearchError(err.message);
        } else {
          setSearchError("検索に失敗しました");
        }
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    },
    []
  );

  // Auto-search from URL query parameter
  const initialSearchDone = useRef(false);
  useEffect(() => {
    if (initialSearchDone.current) return;
    const q = searchParams.get("q");
    if (q) {
      initialSearchDone.current = true;
      setSearchQuery(q);
      performSearch(q, searchSource);
    }
  }, [searchParams, performSearch, searchSource]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery, searchSource);
  };

  const registerBookIfNeeded = async (book: Book): Promise<string> => {
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
  };

  const handleAddToShelf = (book: Book) => {
    setSelectedBook(book);
    setAddStatus("want_to_read");
    setAddError(null);
    setAddSuccess(null);
  };

  const confirmAddToShelf = async () => {
    if (!selectedBook) return;

    setAddingBookId(selectedBook.id || "pending");
    setAddError(null);

    try {
      const bookId = await registerBookIfNeeded(selectedBook);
      await apiClient.post("/me/books", {
        book_id: bookId,
        status: addStatus,
      });
      setAddSuccess(`「${selectedBook.title}」を本棚に追加しました`);
      setSelectedBook(null);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.code === "ALREADY_EXISTS") {
          setAddError("この書籍は既に本棚に追加されています");
        } else {
          setAddError(err.message);
        }
      } else {
        setAddError("追加に失敗しました");
      }
    } finally {
      setAddingBookId(null);
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="font-serif text-xl font-bold text-stone-800">書籍検索</h1>

      {/* Search form */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="タイトル、著者名、ISBNで検索..."
          className="flex-1"
        />
        <Select
          value={searchSource}
          onChange={(e) =>
            setSearchSource(e.target.value as "all" | "internal" | "external")
          }
          className="w-32"
        >
          <option value="all">すべて</option>
          <option value="internal">アプリ内</option>
          <option value="external">外部API</option>
        </Select>
        <Button type="submit" disabled={searching || !searchQuery.trim()}>
          {searching ? "検索中..." : "検索"}
        </Button>
      </form>

      {/* Success message */}
      {addSuccess && (
        <div className="p-3 bg-green-50 text-green-700 text-[13px] rounded border border-green-200 flex justify-between items-center">
          <span>{addSuccess}</span>
          <button
            onClick={() => setAddSuccess(null)}
            className="text-green-500 hover:text-green-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error message */}
      {searchError && (
        <div className="p-3 bg-red-50 text-red-700 text-[13px] rounded border border-red-200">
          {searchError}
        </div>
      )}

      {/* Loading */}
      {searching && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="flex gap-3 p-3 border border-stone-200 rounded animate-pulse"
            >
              <div className="w-16 h-24 bg-stone-100 rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-stone-100 rounded w-3/4" />
                <div className="h-3 bg-stone-100 rounded w-1/2" />
                <div className="h-3 bg-stone-100 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search results */}
      {!searching && searchResults.length > 0 && (
        <div className="space-y-2">
          <p className="text-[13px] text-stone-500">
            {searchResults.length}件の結果
          </p>
          {searchResults.map((book) => (
            <div
              key={book.id || `${book.isbn_13}-${book.title}`}
              className="flex gap-3 p-3 border border-stone-200 rounded bg-white hover:bg-stone-50 transition-colors"
            >
              <div className="w-16 h-24 flex-shrink-0 bg-stone-100 rounded overflow-hidden">
                {book.cover_image_url ? (
                  <img
                    src={book.cover_image_url}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-400 p-1 text-center">
                    No Image
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                {book.id ? (
                  <Link
                    href={`/books/${book.id}`}
                    className="font-medium text-[13px] text-stone-700 hover:text-amber-800 hover:underline truncate block"
                  >
                    {book.title}
                  </Link>
                ) : (
                  <h3 className="font-medium text-[13px] text-stone-700 truncate">
                    {book.title}
                  </h3>
                )}
                {book.subtitle && (
                  <p className="text-xs text-stone-400 truncate">
                    {book.subtitle}
                  </p>
                )}
                <p className="text-xs text-stone-500 mt-0.5">
                  {book.authors?.join(", ") || "著者不明"}
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-stone-400">
                  {book.publisher && <span>{book.publisher}</span>}
                  {book.published_date && (
                    <>
                      {book.publisher && <span>·</span>}
                      <span>{book.published_date}</span>
                    </>
                  )}
                </div>
                {book.isbn_13 && (
                  <p className="text-xs text-stone-400 mt-0.5">
                    ISBN: {book.isbn_13}
                  </p>
                )}
                {book.source && book.source !== "manual" && (
                  <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded">
                    {book.source === "google_books"
                      ? "Google Books"
                      : book.source === "rakuten"
                        ? "楽天ブックス"
                        : book.source}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5 flex-shrink-0 self-center">
                <Button size="sm" onClick={() => handleAddToShelf(book)}>
                  本棚に追加
                </Button>
                {book.id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/books/${book.id}`)}
                  >
                    詳細を見る
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {hasSearched && !searching && searchResults.length === 0 && !searchError && (
        <div className="text-center py-6">
          <p className="text-stone-400 text-sm">
            検索結果が見つかりませんでした
          </p>
          <p className="text-[13px] text-stone-400 mt-1">
            キーワードを変えて再検索するか、
            <Link href="/books/add" className="text-amber-700 hover:underline">
              手動登録
            </Link>
            をお試しください
          </p>
        </div>
      )}

      {/* Initial state */}
      {!hasSearched && !searching && (
        <div className="text-center py-10">
          <p className="text-stone-400 text-sm">
            タイトル、著者名、ISBNで書籍を検索できます
          </p>
        </div>
      )}

      {/* Add to Shelf Dialog */}
      <Dialog
        open={!!selectedBook}
        onOpenChange={(open) => !open && setSelectedBook(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>本棚に追加</DialogTitle>
          </DialogHeader>

          {selectedBook && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-16 h-24 flex-shrink-0 bg-stone-100 rounded overflow-hidden">
                  {selectedBook.cover_image_url ? (
                    <img
                      src={selectedBook.cover_image_url}
                      alt={selectedBook.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[8px] text-stone-400">
                      No Image
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">{selectedBook.title}</p>
                  <p className="text-xs text-stone-400">
                    {selectedBook.authors?.join(", ")}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">ステータス</label>
                <Select
                  value={addStatus}
                  onChange={(e) =>
                    setAddStatus(e.target.value as BookStatus)
                  }
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>

              {addError && (
                <p className="text-sm text-red-600">{addError}</p>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setSelectedBook(null)}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={confirmAddToShelf}
                  disabled={!!addingBookId}
                >
                  {addingBookId ? "追加中..." : "追加する"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
