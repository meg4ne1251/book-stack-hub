"use client";

import { useEffect, useState } from "react";
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
import type { Playlist, PaginatedResponse } from "@/types/api";

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<PaginatedResponse<Playlist>>(
        "/me/playlists"
      );
      setPlaylists(res.data);
    } catch {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    setError(null);

    try {
      await apiClient.post("/me/playlists", {
        title: title.trim(),
        description: description.trim() || null,
      });
      setShowCreate(false);
      setTitle("");
      setDescription("");
      fetchPlaylists();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("作成に失敗しました");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このプレイリストを削除しますか？")) return;
    try {
      await apiClient.delete(`/playlists/${id}`);
      fetchPlaylists();
    } catch {
      // Error handling
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-xl font-bold text-stone-800">プレイリスト</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>新規作成</Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-stone-100 animate-pulse rounded" />
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-stone-400 text-sm">
            プレイリストがありません
          </p>
          <Button className="mt-4" onClick={() => setShowCreate(true)}>
            最初のプレイリストを作成
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {playlists.map((pl) => (
            <div
              key={pl.id}
              className="border border-stone-200 rounded p-3 bg-white hover:bg-stone-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <Link
                  href={`/playlists/${pl.id}`}
                  className="flex-1 min-w-0"
                >
                  <h3 className="font-medium text-sm text-stone-700 truncate">{pl.title}</h3>
                  {pl.description && (
                    <p className="text-[13px] text-stone-400 mt-0.5 line-clamp-2">
                      {pl.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-stone-400">
                      {pl.items?.length || 0}冊
                    </span>
                    {pl.is_public ? (
                      <Badge variant="outline" className="text-xs">
                        公開
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        非公開
                      </Badge>
                    )}
                  </div>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 ml-2"
                  onClick={() => handleDelete(pl.id)}
                >
                  削除
                </Button>
              </div>

              {/* Preview of books */}
              {pl.items && pl.items.length > 0 && (
                <div className="flex gap-2 mt-3 overflow-hidden">
                  {pl.items.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="w-10 h-14 flex-shrink-0 bg-stone-100 rounded overflow-hidden"
                    >
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
                  ))}
                  {pl.items.length > 5 && (
                    <div className="w-10 h-14 flex-shrink-0 bg-stone-100 rounded flex items-center justify-center text-xs text-stone-400">
                      +{pl.items.length - 5}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>プレイリストを作成</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">タイトル *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                placeholder="プレイリスト名"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">説明</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="プレイリストの説明..."
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                キャンセル
              </Button>
              <Button
                onClick={handleCreate}
                disabled={creating || !title.trim()}
              >
                {creating ? "作成中..." : "作成する"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
