"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient, ApiRequestError } from "@/lib/api-client";
import type { UserBook, Playlist, PaginatedResponse, User } from "@/types/api";

export default function UserProfilePage() {
  const params = useParams();
  const username = params.username as string;

  const [profile, setProfile] = useState<User | null>(null);
  const [books, setBooks] = useState<UserBook[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        // Fetch user profile by username - uses user ID internally
        const userRes = await apiClient.get<User>(`/users/${username}`);
        setProfile(userRes);

        // Fetch public books and playlists
        const [booksRes] = await Promise.all([
          apiClient
            .get<PaginatedResponse<UserBook>>(
              `/users/${userRes.id}/books?per_page=12`
            )
            .catch(() => ({ data: [], meta: { page: 1, per_page: 12, total: 0, total_pages: 0 } })),
        ]);
        setBooks(booksRes.data);
      } catch (err) {
        if (err instanceof ApiRequestError) {
          if (err.code === "RESOURCE_NOT_FOUND") {
            setError("ユーザーが見つかりません");
          } else {
            setError(err.message);
          }
        } else {
          setError("プロフィールの取得に失敗しました");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [username]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto animate-pulse space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-muted" />
          <div className="space-y-2">
            <div className="h-6 bg-muted rounded w-32" />
            <div className="h-4 bg-muted rounded w-24" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Profile header */}
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-muted overflow-hidden flex-shrink-0">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
              {profile.display_name[0]}
            </div>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{profile.display_name}</h1>
          <p className="text-muted-foreground">@{profile.username}</p>
          {profile.bio && (
            <p className="text-sm mt-1">{profile.bio}</p>
          )}
        </div>
      </div>

      {/* Public bookshelf */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">本棚</h2>
        {books.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            公開されている書籍はありません
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {books.map((ub) => (
              <Link
                key={ub.id}
                href={`/books/${ub.book.id}`}
                className="group block"
              >
                <div className="aspect-[2/3] bg-muted rounded overflow-hidden">
                  {ub.book.cover_image_url ? (
                    <img
                      src={ub.book.cover_image_url}
                      alt={ub.book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground p-1 text-center">
                      {ub.book.title}
                    </div>
                  )}
                </div>
                <p className="text-xs font-medium mt-1 truncate">
                  {ub.book.title}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
