"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", page.toString());
        params.set("per_page", "24");
        if (activeFilter) params.set("status", activeFilter);
        const res = await apiClient.get<PaginatedResponse<UserBook>>(
          `/me/books?${params.toString()}`
        );
        setBooks(res.data);
        setTotalPages(res.meta.total_pages);
      } catch {
        // Error handling
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, [activeFilter, page]);

  // Reset to page 1 when filter changes
  const handleFilterChange = (filter: string | null) => {
    setActiveFilter(filter);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-xl font-bold text-stone-800">本棚</h1>
        <div className="flex gap-1.5">
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
          onClick={() => handleFilterChange(null)}
        >
          すべて
        </Button>
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <Button
            key={status}
            variant={activeFilter === status ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterChange(status)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Book list */}
      {loading ? (
        <p className="text-stone-400 text-sm">読み込み中...</p>
      ) : books.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-stone-400 text-sm">
            本棚にまだ書籍がありません
          </p>
          <Button className="mt-4" asChild>
            <Link href="/books/add">書籍を追加する</Link>
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {books.map((ub) => (
            <Link
              key={ub.id}
              href={`/books/${ub.book.id}`}
              className="group block"
            >
              <div className="aspect-[2/3] bg-stone-100 rounded overflow-hidden mb-2">
                {ub.book.cover_image_url ? (
                  <img
                    src={ub.book.cover_image_url}
                    alt={ub.book.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-stone-400 p-2 text-center">
                    {ub.book.title}
                  </div>
                )}
              </div>
              <p className="text-sm font-medium truncate">{ub.book.title}</p>
              <p className="text-xs text-stone-400 truncate">
                {ub.book.authors?.join(", ")}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="border border-stone-200 rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-3 py-2.5 text-left text-[13px] font-medium text-stone-500">タイトル</th>
                <th className="px-3 py-2.5 text-left text-[13px] font-medium text-stone-500 hidden md:table-cell">著者</th>
                <th className="px-3 py-2.5 text-left text-[13px] font-medium text-stone-500">ステータス</th>
                <th className="px-3 py-2.5 text-left text-[13px] font-medium text-stone-500 hidden md:table-cell">評価</th>
              </tr>
            </thead>
            <tbody>
              {books.map((ub) => (
                <tr key={ub.id} className="border-t border-stone-100 hover:bg-stone-50">
                  <td className="px-3 py-2.5">
                    <Link href={`/books/${ub.book.id}`} className="text-amber-800 hover:underline text-[13px]">
                      {ub.book.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 hidden md:table-cell text-stone-400 text-[13px]">
                    {ub.book.authors?.join(", ")}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded text-xs">
                      {STATUS_LABELS[ub.status] || ub.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 hidden md:table-cell text-stone-500 text-[13px]">
                    {ub.rating ? "★".repeat(ub.rating) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          <Button
            size="sm"
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            前へ
          </Button>
          <span className="flex items-center text-[13px] text-stone-400">
            {page} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            次へ
          </Button>
        </div>
      )}
    </div>
  );
}
