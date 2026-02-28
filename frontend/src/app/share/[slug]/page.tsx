"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Playlist } from "@/types/api";

export default function SharedPlaylistPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlaylist = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/share/${slug}`);
        if (!res.ok) {
          setError("プレイリストが見つかりません");
          return;
        }
        const json = await res.json();
        setPlaylist(json.data);
      } catch {
        setError("読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    };
    fetchPlaylist();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center">
        <p className="text-stone-400 text-sm">読み込み中...</p>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-sm">{error || "プレイリストが見つかりません"}</p>
          <a href="/" className="text-amber-800 text-sm mt-4 inline-block hover:underline">
            トップページへ
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      {/* Header */}
      <header className="border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <a href="/" className="font-serif text-lg font-bold text-stone-800">
            BookStackHub
          </a>
          <a
            href="/register"
            className="text-sm text-amber-800 hover:underline"
          >
            アカウント作成
          </a>
        </div>
      </header>

      {/* Playlist content */}
      <main className="max-w-3xl mx-auto px-6 py-6 space-y-5">
        <div>
          <h1 className="font-serif text-xl font-bold text-stone-800">{playlist.title}</h1>
          {playlist.description && (
            <p className="text-stone-500 text-sm mt-1">
              {playlist.description}
            </p>
          )}
          <p className="text-sm text-stone-400 mt-1">
          </p>
        </div>

        {/* Book list */}
        {playlist.items && playlist.items.length > 0 && (
          <div className="space-y-3">
            {playlist.items
              .sort((a, b) => a.position - b.position)
              .map((item, index) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-3 border border-stone-200 rounded"
                >
                  <span className="text-base font-bold text-stone-300 w-6 text-center flex-shrink-0 pt-2">
                    {index + 1}
                  </span>
                  <div className="w-16 h-24 flex-shrink-0 bg-stone-100 rounded overflow-hidden">
                    {item.book.cover_image_url ? (
                      <img
                        src={item.book.cover_image_url}
                        alt={item.book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-400 p-1 text-center">
                        {item.book.title}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-stone-800">{item.book.title}</h3>
                    <p className="text-sm text-stone-500">
                      {item.book.authors?.join(", ") || "著者不明"}
                    </p>
                    {item.book.publisher && (
                      <p className="text-xs text-stone-400 mt-1">
                        {item.book.publisher}
                      </p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-6 text-center">
        <p className="text-sm text-stone-400">
          BookStackHub — あなたの読書体験を、もっと豊かに。
        </p>
      </footer>
    </div>
  );
}
