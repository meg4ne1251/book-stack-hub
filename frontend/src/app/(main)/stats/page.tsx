"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ReadingHeatmap } from "@/components/reading-log/heatmap";
import { apiClient } from "@/lib/api-client";
import type { HeatmapData } from "@/types/api";

interface StatsOverview {
  total_books: number;
  books_this_month: number;
  books_this_year: number;
  total_pages_this_year: number;
  status_counts: Record<string, number>;
  monthly_finished: { month: string; count: number }[];
  genre_distribution: { genre: string; count: number }[];
  monthly_spending: { month: string; amount: number }[];
}

const STATUS_LABELS: Record<string, string> = {
  want_to_read: "読みたい",
  unread: "未読",
  tsundoku: "積読",
  reading: "読書中",
  suspended: "中断",
  finished: "読了",
};

export default function StatsPage() {
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapData>({});
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [statsRes, heatmapRes] = await Promise.all([
          apiClient.get<StatsOverview>("/me/stats/overview"),
          apiClient.get<HeatmapData>(
            `/me/reading-logs/heatmap?year=${selectedYear}`
          ),
        ]);
        setStats(statsRes);
        setHeatmapData(heatmapRes);
      } catch {
        // Stats API may not be implemented yet, use placeholder
        setStats(null);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [selectedYear]);

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      await apiClient.post("/me/stats/yearly-report/image", {
        year: selectedYear,
      });
      // TODO: Poll for completion and show download
    } catch {
      // Error handling
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-32" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">統計・レポート</h1>
        <div className="flex items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(
              (year) => (
                <option key={year} value={year}>
                  {year}年
                </option>
              )
            )}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">今月の読了</p>
          <p className="text-3xl font-bold mt-1">
            {stats?.books_this_month ?? "-"}
          </p>
          <p className="text-xs text-muted-foreground">冊</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">今年の読了</p>
          <p className="text-3xl font-bold mt-1">
            {stats?.books_this_year ?? "-"}
          </p>
          <p className="text-xs text-muted-foreground">冊</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">総ページ数</p>
          <p className="text-3xl font-bold mt-1">
            {stats?.total_pages_this_year?.toLocaleString() ?? "-"}
          </p>
          <p className="text-xs text-muted-foreground">ページ（今年）</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">総蔵書数</p>
          <p className="text-3xl font-bold mt-1">
            {stats?.total_books ?? "-"}
          </p>
          <p className="text-xs text-muted-foreground">冊</p>
        </div>
      </div>

      {/* Heatmap */}
      <section className="bg-card border border-border rounded-lg p-4">
        <h2 className="text-sm font-medium mb-3">
          読書ヒートマップ ({selectedYear}年)
        </h2>
        <ReadingHeatmap data={heatmapData} year={selectedYear} />
      </section>

      {/* Status distribution */}
      {stats?.status_counts && (
        <section className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-sm font-medium mb-3">ステータス別冊数</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {Object.entries(stats.status_counts).map(([status, count]) => (
              <div key={status} className="text-center">
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">
                  {STATUS_LABELS[status] || status}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Monthly finished books chart */}
      {stats?.monthly_finished && stats.monthly_finished.length > 0 && (
        <section className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-sm font-medium mb-3">月別読了冊数</h2>
          <div className="flex items-end gap-1 h-40">
            {stats.monthly_finished.map((item) => {
              const maxCount = Math.max(
                ...stats.monthly_finished.map((m) => m.count),
                1
              );
              const height = (item.count / maxCount) * 100;
              return (
                <div
                  key={item.month}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <span className="text-xs text-muted-foreground">
                    {item.count > 0 ? item.count : ""}
                  </span>
                  <div
                    className="w-full bg-primary rounded-t-sm min-h-[2px]"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {item.month.replace(/^\d{4}-/, "")}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Genre distribution */}
      {stats?.genre_distribution && stats.genre_distribution.length > 0 && (
        <section className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-sm font-medium mb-3">ジャンル分布</h2>
          <div className="space-y-2">
            {stats.genre_distribution.slice(0, 10).map((item) => {
              const maxCount = Math.max(
                ...stats.genre_distribution.map((g) => g.count),
                1
              );
              const width = (item.count / maxCount) * 100;
              return (
                <div key={item.genre} className="flex items-center gap-2">
                  <span className="text-xs w-24 text-right truncate">
                    {item.genre}
                  </span>
                  <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                    <div
                      className="h-full bg-primary rounded"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8">
                    {item.count}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Yearly report */}
      <section className="bg-card border border-border rounded-lg p-4">
        <h2 className="text-sm font-medium mb-3">年間読書レポート</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {selectedYear}年の読書活動をまとめたSNS共有用画像を生成できます
        </p>
        <Button
          onClick={handleGenerateReport}
          disabled={generatingReport}
        >
          {generatingReport ? "生成中..." : "レポート画像を生成"}
        </Button>
      </section>
    </div>
  );
}
