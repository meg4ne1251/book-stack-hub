"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import type { PaginatedResponse, UserBook, BookStatus } from "@/types/api";

const STATUS_LABELS: Record<BookStatus, string> = {
  want_to_read: "読みたい",
  unread: "未読",
  tsundoku: "積読",
  reading: "読書中",
  suspended: "中断",
  finished: "読了",
};

export default function BookshelfPage() {
  const [books, setBooks] = useState<UserBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (activeFilter) params.set("status", activeFilter);
        const res = await apiClient.get<PaginatedResponse<UserBook>>(
          `/me/books?${params.toString()}`
        );
        setBooks(res.data);
      } catch {
        // Error handling
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, [activeFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">本棚</h1>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            グリッド
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            リスト
          </Button>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeFilter === null ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter(null)}
        >
          すべて
        </Button>
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <Button
            key={status}
            variant={activeFilter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter(status)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Book list */}
      {loading ? (
        <p className="text-muted-foreground">読み込み中...</p>
      ) : books.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            本棚にまだ書籍がありません
          </p>
          <Button className="mt-4" asChild>
            <a href="/books/add">書籍を追加する</a>
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {books.map((ub) => (
            <a
              key={ub.id}
              href={`/books/${ub.book.id}`}
              className="group block"
            >
              <div className="aspect-[2/3] bg-muted rounded-md overflow-hidden mb-2">
                {ub.book.cover_image_url ? (
                  <img
                    src={ub.book.cover_image_url}
                    alt={ub.book.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground p-2 text-center">
                    {ub.book.title}
                  </div>
                )}
              </div>
              <p className="text-sm font-medium truncate">{ub.book.title}</p>
              <p className="text-xs text-muted-foreground truncate">
                {ub.book.authors?.join(", ")}
              </p>
            </a>
          ))}
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left">タイトル</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">著者</th>
                <th className="px-4 py-3 text-left">ステータス</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">評価</th>
              </tr>
            </thead>
            <tbody>
              {books.map((ub) => (
                <tr key={ub.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3">
                    <a href={`/books/${ub.book.id}`} className="text-primary hover:underline">
                      {ub.book.title}
                    </a>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    {ub.book.authors?.join(", ")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-primary-light text-primary rounded-sm text-xs">
                      {STATUS_LABELS[ub.status] || ub.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {ub.rating ? "★".repeat(ub.rating) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
