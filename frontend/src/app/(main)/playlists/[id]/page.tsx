"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiClient, ApiRequestError } from "@/lib/api-client";
import type { Playlist, Book, PaginatedResponse } from "@/types/api";

export default function PlaylistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const playlistId = params.id as string;

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add book dialog
  const [showAddBook, setShowAddBook] = useState(false);
  const [bookSearchQuery, setBookSearchQuery] = useState("");
  const [bookSearchResults, setBookSearchResults] = useState<Book[]>([]);
  const [searching, setSearching] = useState(false);

  const fetchPlaylist = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ data: Playlist }>(`/playlists/${playlistId}`);
      setPlaylist(res.data);
      setEditTitle(res.data.title);
      setEditDescription(res.data.description || "");
      setEditIsPublic(res.data.is_public);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("プレイリストの取得に失敗しました");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylist();
  }, [playlistId]);

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const res = await apiClient.patch<{ data: Playlist }>(`/playlists/${playlistId}`, {
        title: editTitle,
        description: editDescription || null,
        is_public: editIsPublic,
      });
      setPlaylist(res.data);
      setEditing(false);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSearchBooks = async () => {
    if (!bookSearchQuery.trim()) return;
    setSearching(true);
    try {
      const params = new URLSearchParams({
        q: bookSearchQuery,
        source: "internal",
        per_page: "10",
      });
      const res = await apiClient.get<PaginatedResponse<Book>>(
        `/books/search?${params.toString()}`
      );
      setBookSearchResults(res.data);
    } catch {
      // Error handling
    } finally {
      setSearching(false);
    }
  };

  const handleAddBook = async (bookId: string) => {
    try {
      await apiClient.post(`/playlists/${playlistId}/items`, {
        book_id: bookId,
      });
      setShowAddBook(false);
      setBookSearchQuery("");
      setBookSearchResults([]);
      fetchPlaylist();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      }
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!confirm("この書籍をプレイリストから削除しますか？")) return;
    try {
      await apiClient.delete(`/playlists/${playlistId}/items/${itemId}`);
      fetchPlaylist();
    } catch {
      // Error handling
    }
  };

  const handleDelete = async () => {
    if (!confirm("このプレイリストを削除しますか？")) return;
    try {
      await apiClient.delete(`/playlists/${playlistId}`);
      router.push("/playlists");
    } catch {
      setError("削除に失敗しました");
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl animate-pulse space-y-4">
        <div className="h-6 bg-stone-100 rounded w-1/2" />
        <div className="h-4 bg-stone-100 rounded w-3/4" />
        <div className="space-y-3 mt-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-stone-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !playlist) {
    return (
      <div className="max-w-3xl text-center py-10">
        <p className="text-red-600 text-sm">{error}</p>
        <Button className="mt-4" variant="outline" onClick={() => router.back()}>
          戻る
        </Button>
      </div>
    );
  }

  if (!playlist) return null;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-xl font-bold text-stone-800">{playlist.title}</h1>
          {playlist.description && (
            <p className="text-stone-500 text-sm mt-1">
              {playlist.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">
              {playlist.is_public ? "公開" : "非公開"}
            </Badge>
            <span className="text-sm text-stone-400">
              {playlist.items?.length || 0}冊
            </span>
            {playlist.share_slug && (
              <span className="text-xs text-stone-400">
                共有URL: /share/{playlist.share_slug}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            編集
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-red-600"
          >
            削除
          </Button>
        </div>
      </div>

      {/* Add book button */}
      <Button variant="outline" onClick={() => setShowAddBook(true)}>
        書籍を追加
      </Button>

      {/* Items list */}
      {playlist.items && playlist.items.length > 0 ? (
        <div className="space-y-2">
          {playlist.items
            .sort((a, b) => a.position - b.position)
            .map((item, index) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-3 border border-stone-200 rounded"
              >
                <span className="text-sm text-stone-400 w-6 text-center">
                  {index + 1}
                </span>
                <div className="w-10 h-14 flex-shrink-0 bg-stone-100 rounded overflow-hidden">
                  {item.book.cover_image_url ? (
                    <img
                      src={item.book.cover_image_url}
                      alt={item.book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-stone-100" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/books/${item.book.id}`}
                    className="text-sm font-medium hover:text-amber-800 truncate block"
                  >
                    {item.book.title}
                  </Link>
                  <p className="text-xs text-stone-400 truncate">
                    {item.book.authors?.join(", ")}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600"
                  onClick={() => handleRemoveItem(item.id)}
                >
                  削除
                </Button>
              </div>
            ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-stone-400 text-sm">
            書籍がまだ追加されていません
          </p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>プレイリストを編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">タイトル</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">説明</label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                maxLength={1000}
                rows={3}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editIsPublic}
                onChange={(e) => setEditIsPublic(e.target.checked)}
                className="rounded"
              />
              公開する
            </label>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditing(false)}>
                キャンセル
              </Button>
              <Button onClick={handleSaveEdit} disabled={saving || !editTitle}>
                {saving ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Book Dialog */}
      <Dialog open={showAddBook} onOpenChange={setShowAddBook}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>書籍を追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearchBooks();
              }}
              className="flex gap-2"
            >
              <Input
                value={bookSearchQuery}
                onChange={(e) => setBookSearchQuery(e.target.value)}
                placeholder="本棚内の書籍を検索..."
                className="flex-1"
              />
              <Button type="submit" disabled={searching}>
                {searching ? "検索中..." : "検索"}
              </Button>
            </form>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {bookSearchResults.map((book) => (
                <div
                  key={book.id}
                  className="flex items-center gap-3 p-2 border border-stone-200 rounded hover:bg-stone-50 cursor-pointer"
                  onClick={() => handleAddBook(book.id)}
                >
                  <div className="w-8 h-12 flex-shrink-0 bg-stone-100 rounded overflow-hidden">
                    {book.cover_image_url ? (
                      <img
                        src={book.cover_image_url}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-stone-100" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{book.title}</p>
                    <p className="text-xs text-stone-400 truncate">
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
