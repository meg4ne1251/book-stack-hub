"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";

const navigation = [
  { name: "ダッシュボード", href: "/dashboard", icon: "LayoutDashboard" },
  { name: "本棚", href: "/bookshelf", icon: "Library" },
  { name: "書籍検索", href: "/search", icon: "Search" },
  { name: "書籍追加", href: "/books/add", icon: "Plus" },
  { name: "読書ログ", href: "/reading-log", icon: "BookOpen" },
  { name: "プレイリスト", href: "/playlists", icon: "ListMusic" },
  { name: "統計", href: "/stats", icon: "BarChart3" },
  { name: "設定", href: "/settings", icon: "Settings" },
];

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();
  const { isSidebarOpen, toggleSidebar } = useUIStore();

  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Ignore errors - still logout locally
    }
    apiClient.setAccessToken(null);
    logout();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-stone-400 text-sm">読み込み中...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.replace("/login");
    return null;
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-56 bg-stone-50 border-r border-stone-200 transition-transform duration-200 lg:translate-x-0 lg:static",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center h-14 px-5 border-b border-stone-200">
          <Link href="/dashboard" className="font-serif text-lg font-semibold text-stone-800 tracking-tight">
            BookStackHub
          </Link>
        </div>

        <nav className="px-3 py-3 space-y-0.5">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 rounded text-[13px] transition-colors",
                pathname === item.href
                  ? "bg-amber-100/80 text-amber-900 font-medium"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-800"
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {user && (
          <div className="absolute bottom-0 left-0 right-0 px-4 py-3 border-t border-stone-200">
            <p className="text-[13px] font-medium text-stone-700 truncate">{user.display_name}</p>
            <p className="text-xs text-stone-400 truncate">
              @{user.username}
            </p>
            <button
              className="mt-2 text-xs text-stone-400 hover:text-red-600 transition-colors"
              onClick={handleLogout}
            >
              ログアウト
            </button>
          </div>
        )}
      </aside>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 flex items-center h-14 px-5 bg-[#faf7f2]/95 backdrop-blur-sm border-b border-stone-200">
          <button
            onClick={toggleSidebar}
            className="lg:hidden mr-3 p-1.5 rounded hover:bg-accent text-stone-500"
          >
            <span className="sr-only">メニュー</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="flex-1" />
        </header>

        <div className="px-5 py-5 max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
