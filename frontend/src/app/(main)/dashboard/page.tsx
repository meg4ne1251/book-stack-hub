"use client";

import { useAuthStore } from "@/stores/authStore";

export default function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        ようこそ、{user?.display_name}さん
      </h1>

      {/* 統合検索バー */}
      <div className="relative">
        <input
          type="text"
          placeholder="書籍を検索..."
          className="w-full h-12 pl-12 pr-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>

      {/* 統計サマリー */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="読書中" value="-" />
        <StatCard label="今月の読了" value="-" />
        <StatCard label="今年の読了" value="-" />
        <StatCard label="総蔵書数" value="-" />
      </div>

      {/* ヒートマップ（プレースホルダー） */}
      <div className="p-6 bg-card rounded-lg border border-border">
        <h2 className="text-lg font-semibold mb-4">読書ヒートマップ</h2>
        <p className="text-muted-foreground text-sm">
          読書ログを記録すると、GitHub風のヒートマップが表示されます
        </p>
      </div>

      {/* 最近追加した書籍 */}
      <div className="p-6 bg-card rounded-lg border border-border">
        <h2 className="text-lg font-semibold mb-4">最近追加した書籍</h2>
        <p className="text-muted-foreground text-sm">
          本棚に書籍を追加すると、ここに表示されます
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 bg-card rounded-lg border border-border">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
