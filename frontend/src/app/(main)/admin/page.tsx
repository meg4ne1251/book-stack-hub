"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { apiClient, ApiRequestError } from "@/lib/api-client";
import type { User, Review, Playlist, PaginatedResponse } from "@/types/api";

interface AdminStats {
  total_users: number;
  active_users_30d: number;
  total_books: number;
  total_custom_books: number;
  total_reviews: number;
  total_playlists: number;
}

export default function AdminPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("users");

  // Users
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);

  // Stats
  const [stats, setStats] = useState<AdminStats | null>(null);

  // Reviews
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Playlists
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);

  // Check admin access
  if (user?.role !== "admin") {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">管理者権限が必要です</p>
      </div>
    );
  }

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({
        page: usersPage.toString(),
        per_page: "20",
      });
      if (userSearch) params.set("q", userSearch);
      const res = await apiClient.get<PaginatedResponse<User>>(
        `/admin/users?${params.toString()}`
      );
      setUsers(res.data);
      setUsersTotalPages(res.meta.total_pages);
    } catch {
      // Error handling
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await apiClient.get<AdminStats>("/admin/stats");
      setStats(res);
    } catch {
      // Error handling
    }
  };

  const fetchReviews = async () => {
    setReviewsLoading(true);
    try {
      const res = await apiClient.get<PaginatedResponse<Review>>(
        "/admin/reviews?per_page=20"
      );
      setReviews(res.data);
    } catch {
      // Error handling
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchPlaylists = async () => {
    setPlaylistsLoading(true);
    try {
      const res = await apiClient.get<PaginatedResponse<Playlist>>(
        "/admin/playlists?per_page=20"
      );
      setPlaylists(res.data);
    } catch {
      // Error handling
    } finally {
      setPlaylistsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [usersPage]);

  useEffect(() => {
    if (activeTab === "reviews") fetchReviews();
    if (activeTab === "playlists") fetchPlaylists();
  }, [activeTab]);

  const handleToggleUserActive = async (userId: string, isActive: boolean) => {
    try {
      await apiClient.patch(`/admin/users/${userId}`, {
        is_active: !isActive,
      });
      fetchUsers();
    } catch {
      // Error handling
    }
  };

  const handleToggleUserRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    if (
      !confirm(
        `このユーザーのロールを${newRole === "admin" ? "管理者" : "一般ユーザー"}に変更しますか？`
      )
    )
      return;
    try {
      await apiClient.patch(`/admin/users/${userId}`, { role: newRole });
      fetchUsers();
    } catch {
      // Error handling
    }
  };

  const handleHideReview = async (reviewId: string) => {
    if (!confirm("このレビューを非公開にしますか？")) return;
    try {
      await apiClient.patch(`/admin/reviews/${reviewId}`, {
        is_public: false,
      });
      fetchReviews();
    } catch {
      // Error handling
    }
  };

  const handleHidePlaylist = async (playlistId: string) => {
    if (!confirm("このプレイリストを非公開にしますか？")) return;
    try {
      await apiClient.patch(`/admin/playlists/${playlistId}`, {
        is_public: false,
      });
      fetchPlaylists();
    } catch {
      // Error handling
    }
  };

  const handleRefreshBooks = async () => {
    if (!confirm("書籍情報の更新バッチを実行しますか？")) return;
    try {
      await apiClient.post("/admin/books/refresh");
    } catch {
      // Error handling
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">管理者ダッシュボード</h1>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.total_users}</p>
            <p className="text-xs text-muted-foreground">総ユーザー</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.active_users_30d}</p>
            <p className="text-xs text-muted-foreground">アクティブ(30日)</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.total_books}</p>
            <p className="text-xs text-muted-foreground">総書籍</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.total_custom_books}</p>
            <p className="text-xs text-muted-foreground">カスタム書籍</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.total_reviews}</p>
            <p className="text-xs text-muted-foreground">総レビュー</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.total_playlists}</p>
            <p className="text-xs text-muted-foreground">総プレイリスト</p>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users">ユーザー管理</TabsTrigger>
          <TabsTrigger value="reviews">レビュー管理</TabsTrigger>
          <TabsTrigger value="playlists">プレイリスト管理</TabsTrigger>
          <TabsTrigger value="system">システム</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <div className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setUsersPage(1);
                fetchUsers();
              }}
              className="flex gap-2"
            >
              <Input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="ユーザーを検索..."
                className="max-w-sm"
              />
              <Button type="submit">検索</Button>
            </form>

            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left">ユーザー</th>
                    <th className="px-4 py-3 text-left">メール</th>
                    <th className="px-4 py-3 text-left">ロール</th>
                    <th className="px-4 py-3 text-left">状態</th>
                    <th className="px-4 py-3 text-left">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {usersLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        読み込み中...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        ユーザーが見つかりません
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="border-t border-border">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{u.display_name}</p>
                            <p className="text-xs text-muted-foreground">
                              @{u.username}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {u.email}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              u.role === "admin" ? "default" : "outline"
                            }
                          >
                            {u.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={u.is_active ? "secondary" : "destructive"}
                          >
                            {u.is_active ? "有効" : "無効"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleToggleUserActive(u.id, u.is_active)
                              }
                            >
                              {u.is_active ? "無効化" : "有効化"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleToggleUserRole(u.id, u.role)
                              }
                            >
                              ロール変更
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {usersTotalPages > 1 && (
              <div className="flex justify-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={usersPage === 1}
                  onClick={() => setUsersPage((p) => p - 1)}
                >
                  前へ
                </Button>
                <span className="flex items-center text-sm">
                  {usersPage} / {usersTotalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={usersPage === usersTotalPages}
                  onClick={() => setUsersPage((p) => p + 1)}
                >
                  次へ
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews">
          <div className="space-y-3">
            {reviewsLoading ? (
              <p className="text-muted-foreground">読み込み中...</p>
            ) : reviews.length === 0 ? (
              <p className="text-muted-foreground">公開レビューがありません</p>
            ) : (
              reviews.map((review) => (
                <div
                  key={review.id}
                  className="flex items-start gap-4 p-4 border border-border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium">{review.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {review.body}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(review.created_at).toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => handleHideReview(review.id)}
                  >
                    非公開化
                  </Button>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* Playlists Tab */}
        <TabsContent value="playlists">
          <div className="space-y-3">
            {playlistsLoading ? (
              <p className="text-muted-foreground">読み込み中...</p>
            ) : playlists.length === 0 ? (
              <p className="text-muted-foreground">
                公開プレイリストがありません
              </p>
            ) : (
              playlists.map((pl) => (
                <div
                  key={pl.id}
                  className="flex items-start gap-4 p-4 border border-border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium">{pl.title}</h3>
                    {pl.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {pl.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {pl.items?.length || 0}冊
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => handleHidePlaylist(pl.id)}
                  >
                    非公開化
                  </Button>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system">
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <h3 className="font-medium">書籍情報更新バッチ</h3>
              <p className="text-sm text-muted-foreground">
                半年以上更新されていない書籍の情報を外部APIから再取得します
              </p>
              <Button variant="outline" onClick={handleRefreshBooks}>
                バッチを実行
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
