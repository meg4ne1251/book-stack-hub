"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BookSearchResults } from "@/components/books/book-search-results";
import { BarcodeScanner } from "@/components/books/barcode-scanner";
import { CustomBookForm } from "@/components/books/custom-book-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
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

export default function BooksAddPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSource, setSearchSource] = useState<"all" | "internal" | "external">("all");
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Barcode scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [scannedBooks, setScannedBooks] = useState<Book[]>([]);

  // Add to shelf dialog
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [addStatus, setAddStatus] = useState<BookStatus>("want_to_read");
  const [addingBookId, setAddingBookId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  // Ref for search debounce
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery, searchSource);
  };

  const handleAddToShelf = (book: Book) => {
    setSelectedBook(book);
    setAddStatus("want_to_read");
    setAddError(null);
  };

  const confirmAddToShelf = async () => {
    if (!selectedBook) return;

    setAddingBookId(selectedBook.id);
    setAddError(null);

    try {
      await apiClient.post("/me/books", {
        book_id: selectedBook.id,
        status: addStatus,
      });
      setSelectedBook(null);
      // Show success feedback
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

  const handleBarcodeScan = useCallback(
    async (isbn: string) => {
      if (continuousMode) {
        // In continuous mode, automatically add to shelf as "unread"
        try {
          const params = new URLSearchParams({ isbn, source: "all" });
          const res = await apiClient.get<BookSearchResponse>(
            `/books/search?${params.toString()}`
          );
          if (res.data.length > 0) {
            const book = res.data[0];
            try {
              await apiClient.post("/me/books", {
                book_id: book.id,
                status: "unread" as BookStatus,
                is_owned: true,
              });
              setScannedBooks((prev) => [book, ...prev]);
              // Vibration feedback
              if (navigator.vibrate) {
                navigator.vibrate(100);
              }
            } catch {
              // Already exists or other error, still add to display
              setScannedBooks((prev) => [book, ...prev]);
            }
          }
        } catch {
          // Ignore errors in continuous mode
        }
      } else {
        // Single mode: search and show results
        setShowScanner(false);
        setSearchQuery(isbn);
        performSearch(isbn, "all");
      }
    },
    [continuousMode, performSearch]
  );

  const handleCustomBookSuccess = () => {
    router.push("/bookshelf");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">書籍を追加</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="search" className="flex-1">
            検索して追加
          </TabsTrigger>
          <TabsTrigger value="scan" className="flex-1">
            バーコードスキャン
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex-1">
            手動登録
          </TabsTrigger>
        </TabsList>

        {/* Search Tab */}
        <TabsContent value="search">
          <div className="space-y-4">
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
                  setSearchSource(
                    e.target.value as "all" | "internal" | "external"
                  )
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

            {searchError && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                {searchError}
              </div>
            )}

            {searching && (
              <p className="text-sm text-muted-foreground">
                検索中...（混雑により少々お待ちください）
              </p>
            )}

            <BookSearchResults
              results={searchResults}
              loading={searching}
              onAddToShelf={handleAddToShelf}
              addingBookId={addingBookId}
            />

            {hasSearched && !searching && searchResults.length === 0 && !searchError && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  検索結果が見つかりませんでした
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  見つからない場合は「手動登録」タブからカスタム書籍を登録できます
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Barcode Scan Tab */}
        <TabsContent value="scan">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={continuousMode}
                    onChange={(e) => setContinuousMode(e.target.checked)}
                    className="rounded"
                  />
                  連続スキャンモード
                </label>
              </div>
              {!showScanner && (
                <Button onClick={() => setShowScanner(true)}>
                  スキャンを開始
                </Button>
              )}
            </div>

            {showScanner && (
              <BarcodeScanner
                onScan={handleBarcodeScan}
                onClose={() => setShowScanner(false)}
                continuousMode={continuousMode}
              />
            )}

            {/* Scanned books list (continuous mode) */}
            {scannedBooks.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">
                  スキャン済み ({scannedBooks.length}冊)
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {scannedBooks.map((book, i) => (
                    <div key={i} className="flex-shrink-0 w-16">
                      <div className="aspect-[2/3] bg-muted rounded overflow-hidden">
                        {book.cover_image_url ? (
                          <img
                            src={book.cover_image_url}
                            alt={book.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[8px] text-muted-foreground p-0.5 text-center">
                            {book.title}
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] truncate mt-1">{book.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Custom Book Tab */}
        <TabsContent value="custom">
          <CustomBookForm onSuccess={handleCustomBookSuccess} />
        </TabsContent>
      </Tabs>

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
                <div className="w-16 h-24 flex-shrink-0 bg-muted rounded overflow-hidden">
                  {selectedBook.cover_image_url ? (
                    <img
                      src={selectedBook.cover_image_url}
                      alt={selectedBook.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[8px] text-muted-foreground">
                      No Image
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">{selectedBook.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedBook.authors?.join(", ")}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">ステータス</Label>
                <Select
                  value={addStatus}
                  onChange={(e) => setAddStatus(e.target.value as BookStatus)}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>

              {addError && (
                <p className="text-sm text-destructive">{addError}</p>
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

function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className || ""}`}
      {...props}
    />
  );
}
