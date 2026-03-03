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
        <p className="text-muted-foreground">読み込み中...</p>
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
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transition-transform duration-300 lg:translate-x-0 lg:static",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center h-16 px-6 border-b border-border">
          <Link href="/dashboard" className="text-xl font-bold text-primary">
            BookStackHub
          </Link>
        </div>

        <nav className="p-4 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-primary-light text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {user && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
            <p className="text-sm font-medium truncate">{user.display_name}</p>
            <p className="text-xs text-muted-foreground truncate">
              @{user.username}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
            >
              ログアウト
            </Button>
          </div>
        )}
      </aside>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 flex items-center h-16 px-6 bg-background border-b border-border">
          <button
            onClick={toggleSidebar}
            className="lg:hidden mr-4 p-2 rounded-md hover:bg-accent"
          >
            <span className="sr-only">メニュー</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="flex-1" />
        </header>

        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
