"use client";

import { Button } from "@/components/ui/button";
import type { Book } from "@/types/api";

interface BookSearchResultsProps {
  results: Book[];
  loading: boolean;
  onAddToShelf: (book: Book) => void;
  addingBookId: string | null;
}

export function BookSearchResults({
  results,
  loading,
  onAddToShelf,
  addingBookId,
}: BookSearchResultsProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-4 p-4 border border-border rounded-lg animate-pulse">
            <div className="w-20 h-28 bg-muted rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-4 bg-muted rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {results.map((book) => (
        <div
          key={book.id || `${book.isbn_13}-${book.title}`}
          className="flex gap-4 p-4 border border-border rounded-lg hover:bg-accent/30 transition-colors"
        >
          <div className="w-20 h-28 flex-shrink-0 bg-muted rounded overflow-hidden">
            {book.cover_image_url ? (
              <img
                src={book.cover_image_url}
                alt={book.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground p-1 text-center">
                No Image
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{book.title}</h3>
            {book.subtitle && (
              <p className="text-xs text-muted-foreground truncate">
                {book.subtitle}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {book.authors?.join(", ") || "著者不明"}
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              {book.publisher && <span>{book.publisher}</span>}
              {book.published_date && (
                <>
                  {book.publisher && <span>·</span>}
                  <span>{book.published_date}</span>
                </>
              )}
            </div>
            {book.isbn_13 && (
              <p className="text-xs text-muted-foreground mt-1">
                ISBN: {book.isbn_13}
              </p>
            )}
          </div>

          <div className="flex-shrink-0 self-center">
            <Button
              size="sm"
              onClick={() => onAddToShelf(book)}
              disabled={addingBookId === book.id}
            >
              {addingBookId === book.id ? "追加中..." : "本棚に追加"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
