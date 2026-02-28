"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { apiClient } from "@/lib/api-client";
import { ReadingHeatmap } from "@/components/reading-log/heatmap";
import type { HeatmapData, UserBook, PaginatedResponse } from "@/types/api";

interface DashboardStats {
  reading_count: number;
  finished_this_month: number;
  finished_this_year: number;
  total_books: number;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapData>({});
  const [recentBooks, setRecentBooks] = useState<UserBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const [statsRes, heatmapRes, recentRes] = await Promise.all([
          apiClient
            .get<DashboardStats>("/me/stats/overview")
            .catch(() => null),
          apiClient
            .get<{ data: HeatmapData }>(
              `/me/reading-logs/heatmap?year=${new Date().getFullYear()}`
            )
            .catch(() => ({ data: {} })),
          apiClient
            .get<PaginatedResponse<UserBook>>(
              "/me/books?per_page=6&sort=-created_at"
            )
            .catch(() => ({ data: [], meta: { page: 1, per_page: 6, total: 0, total_pages: 0 } })),
        ]);
        if (statsRes) setStats(statsRes);
        setHeatmapData(heatmapRes.data);
        setRecentBooks(recentRes.data);
      } catch {
        // Silently handle errors for dashboard
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="font-serif text-xl font-bold text-stone-800">
        {user?.display_name}さんの本棚
      </h1>

      {/* 統合検索バー */}
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="書籍を検索..."
          className="w-full h-10 pl-10 pr-4 rounded border border-stone-300 bg-white text-sm focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700/20"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </form>

      {/* 統計サマリー */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="読書中"
          value={loading ? "-" : String(stats?.reading_count ?? 0)}
        />
        <StatCard
          label="今月の読了"
          value={loading ? "-" : String(stats?.finished_this_month ?? 0)}
        />
        <StatCard
          label="今年の読了"
          value={loading ? "-" : String(stats?.finished_this_year ?? 0)}
        />
        <StatCard
          label="総蔵書数"
          value={loading ? "-" : String(stats?.total_books ?? 0)}
        />
      </div>

      {/* ヒートマップ */}
      <div className="p-4 bg-white rounded border border-stone-200">
        <h2 className="text-sm font-medium text-stone-600 mb-3">読書ヒートマップ</h2>
        {Object.keys(heatmapData).length > 0 ? (
          <ReadingHeatmap data={heatmapData} />
        ) : (
          <p className="text-stone-400 text-[13px]">
            読書ログを記録すると、ヒートマップが表示されます
          </p>
        )}
      </div>

      {/* 最近追加した書籍 */}
      <div className="p-4 bg-white rounded border border-stone-200">
        <h2 className="text-sm font-medium text-stone-600 mb-3">最近追加した書籍</h2>
        {recentBooks.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {recentBooks.map((ub) => (
              <Link
                key={ub.id}
                href={`/books/${ub.book.id}`}
                className="group block"
              >
                <div className="aspect-[2/3] bg-stone-100 rounded overflow-hidden mb-1">
                  {ub.book.cover_image_url ? (
                    <img
                      src={ub.book.cover_image_url}
                      alt={ub.book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-400 p-1 text-center">
                      {ub.book.title}
                    </div>
                  )}
                </div>
                <p className="text-xs font-medium truncate">{ub.book.title}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-stone-400 text-[13px]">
            本棚に書籍を追加すると、ここに表示されます
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-white rounded border border-stone-200">
      <p className="text-[13px] text-stone-500">{label}</p>
      <p className="text-xl font-bold text-stone-800 mt-0.5">{value}</p>
    </div>
  );
}
