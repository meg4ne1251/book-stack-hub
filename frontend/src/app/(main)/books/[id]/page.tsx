"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiClient, ApiRequestError } from "@/lib/api-client";
import { STATUS_LABELS } from "@/lib/constants";
import type {
  Book,
  UserBook,
  BookStatus,
  Review,
  Tag,
  PaginatedResponse,
} from "@/types/api";

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.id as string;

  const [book, setBook] = useState<Book | null>(null);
  const [userBook, setUserBook] = useState<UserBook | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<BookStatus>("want_to_read");
  const [rating, setRating] = useState<number | null>(null);
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);

  // Review state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [reviewIsPublic, setReviewIsPublic] = useState(false);
  const [savingReview, setSavingReview] = useState(false);

  // Tag state
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [showTagManager, setShowTagManager] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  const fetchTags = async () => {
    try {
      const res = await apiClient.get<{ data: Tag[] }>("/me/tags");
      setAllTags(res.data);
    } catch {
      // Error handling
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [bookRes, reviewsRes] = await Promise.all([
          apiClient.get<{ data: Book }>(`/books/${bookId}`),
          apiClient
            .get<PaginatedResponse<Review>>(`/books/${bookId}/reviews`)
            .catch(() => ({ data: [], meta: { page: 1, per_page: 20, total: 0, total_pages: 0 } })),
        ]);
        setBook(bookRes.data);
        setReviews(reviewsRes.data);
        fetchTags();

        // Try to get user's book entry
        try {
          const myBooksRes = await apiClient.get<PaginatedResponse<UserBook>>(
            `/me/books?book_id=${bookId}`
          );
          if (myBooksRes.data.length > 0) {
            const ub = myBooksRes.data[0];
            setUserBook(ub);
            setNewStatus(ub.status);
            setRating(ub.rating);
            setMemo(ub.private_memo || "");
          }
        } catch {
          // User hasn't added this book
        }
      } catch (err) {
        if (err instanceof ApiRequestError) {
          setError(err.message);
        } else {
          setError("書籍情報の取得に失敗しました");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [bookId]);

  const handleAddToShelf = async (status: BookStatus) => {
    try {
      const res = await apiClient.post<{ data: UserBook }>("/me/books", {
        book_id: bookId,
        status,
      });
      setUserBook(res.data);
      setNewStatus(res.data.status);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "ALREADY_EXISTS") {
        // Already added, refresh
      }
    }
  };

  const handleUpdateUserBook = async () => {
    if (!userBook) return;
    setSaving(true);
    try {
      const res = await apiClient.patch<{ data: UserBook }>(
        `/me/books/${userBook.id}`,
        {
          status: newStatus,
          rating,
          private_memo: memo || null,
        }
      );
      setUserBook(res.data);
      setEditingStatus(false);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFromShelf = async () => {
    if (!userBook || !confirm("本棚からこの書籍を削除しますか？")) return;
    try {
      await apiClient.delete(`/me/books/${userBook.id}`);
      setUserBook(null);
      setRating(null);
      setMemo("");
    } catch {
      setError("削除に失敗しました");
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewTitle || !reviewBody) return;
    setSavingReview(true);
    try {
      await apiClient.post("/me/reviews", {
        book_id: bookId,
        title: reviewTitle,
        body: reviewBody,
        is_public: reviewIsPublic,
      });
      // Refresh reviews
      const reviewsRes = await apiClient.get<PaginatedResponse<Review>>(
        `/books/${bookId}/reviews`
      );
      setReviews(reviewsRes.data);
      setShowReviewForm(false);
      setReviewTitle("");
      setReviewBody("");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      }
    } finally {
      setSavingReview(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const res = await apiClient.post<{ data: Tag }>("/me/tags", {
        name: newTagName.trim(),
      });
      setAllTags((prev) => [...prev, res.data]);
      setNewTagName("");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      }
    }
  };

  const handleAddTag = async (tagId: string) => {
    if (!userBook) return;
    try {
      await apiClient.post(`/me/books/${userBook.id}/tags`, {
        tag_id: tagId,
      });
      // Refresh user book data
      const myBooksRes = await apiClient.get<PaginatedResponse<UserBook>>(
        `/me/books?book_id=${bookId}`
      );
      if (myBooksRes.data.length > 0) {
        setUserBook(myBooksRes.data[0]);
      }
    } catch {
      // Tag might already be added
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!userBook) return;
    try {
      await apiClient.delete(`/me/books/${userBook.id}/tags/${tagId}`);
      setUserBook({
        ...userBook,
        tags: userBook.tags.filter((t) => t.id !== tagId),
      });
    } catch {
      // Error handling
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm("このタグを削除しますか？すべての書籍からこのタグが外れます。")) return;
    try {
      await apiClient.delete(`/me/tags/${tagId}`);
      setAllTags((prev) => prev.filter((t) => t.id !== tagId));
      if (userBook) {
        setUserBook({
          ...userBook,
          tags: userBook.tags.filter((t) => t.id !== tagId),
        });
      }
    } catch {
      // Error handling
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl animate-pulse space-y-5">
        <div className="flex gap-5">
          <div className="w-40 h-60 bg-stone-100 rounded" />
          <div className="flex-1 space-y-2">
            <div className="h-6 bg-stone-100 rounded w-3/4" />
            <div className="h-4 bg-stone-100 rounded w-1/2" />
            <div className="h-4 bg-stone-100 rounded w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !book) {
    return (
      <div className="max-w-3xl text-center py-10">
        <p className="text-red-600 text-sm">{error}</p>
        <Button className="mt-4" variant="outline" onClick={() => router.back()}>
          戻る
        </Button>
      </div>
    );
  }

  if (!book) return null;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Book Info */}
      <div className="flex flex-col sm:flex-row gap-5">
        <div className="w-40 flex-shrink-0">
          <div className="aspect-[2/3] bg-stone-100 rounded overflow-hidden shadow-sm">
            {book.cover_image_url ? (
              <img
                src={book.cover_image_url}
                alt={book.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[13px] text-stone-400 p-3 text-center">
                {book.title}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <h1 className="font-serif text-xl font-bold text-stone-800">{book.title}</h1>
            {book.subtitle && (
              <p className="text-sm text-stone-500 mt-0.5">{book.subtitle}</p>
            )}
          </div>

          <p className="text-stone-500 text-sm">
            {book.authors?.join(", ") || "著者不明"}
          </p>

          <div className="flex flex-wrap gap-3 text-[13px] text-stone-400">
            {book.publisher && <span>{book.publisher}</span>}
            {book.published_date && <span>{book.published_date}</span>}
            {book.page_count && <span>{book.page_count}ページ</span>}
            {book.language && <span>{book.language.toUpperCase()}</span>}
          </div>

          <div className="flex flex-wrap gap-2">
            {book.isbn_13 && (
              <Badge variant="outline">ISBN: {book.isbn_13}</Badge>
            )}
            {book.isbn_10 && (
              <Badge variant="outline">ISBN-10: {book.isbn_10}</Badge>
            )}
            {book.is_custom && <Badge variant="secondary">カスタム書籍</Badge>}
            {book.categories?.map((cat) => (
              <Badge key={cat} variant="outline">
                {cat}
              </Badge>
            ))}
          </div>

          {book.series_title && (
            <p className="text-sm">
              シリーズ: {book.series_title}
              {book.volume_number && ` (${book.volume_number})`}
            </p>
          )}

          {/* Shelf actions */}
          {!userBook ? (
            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={() => handleAddToShelf("want_to_read")}>
                買いたい/読みたいに追加
              </Button>
              <Button
                variant="outline"
                onClick={() => handleAddToShelf("reading")}
              >
                読書中に追加
              </Button>
              <Button
                variant="outline"
                onClick={() => handleAddToShelf("finished")}
              >
                読了として追加
              </Button>
            </div>
          ) : (
            <div className="bg-white border border-stone-200 rounded p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge>{STATUS_LABELS[userBook.status]}</Badge>
                  {userBook.rating && (
                    <span className="text-yellow-500">
                      {"★".repeat(userBook.rating)}
                      {"☆".repeat(5 - userBook.rating)}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingStatus(true)}
                  >
                    編集
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600"
                    onClick={handleRemoveFromShelf}
                  >
                    削除
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {userBook.tags.map((tag) => (
                  <Badge key={tag.id} variant="outline" className="text-xs">
                    {tag.name}
                  </Badge>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-stone-400 h-6 px-2"
                  onClick={() => setShowTagManager(true)}
                >
                  + タグ管理
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {book.description && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-stone-700">あらすじ・概要</h2>
          <p className="text-[13px] text-stone-500 leading-relaxed whitespace-pre-wrap">
            {book.description}
          </p>
        </section>
      )}

      {/* Data credit */}
      <p className="text-xs text-stone-400">
        データ提供元: {book.source === "google" ? "Google Books" : book.source === "rakuten" ? "楽天ブックス" : book.source}
      </p>

      {/* Reviews */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-700">レビュー</h2>
          {userBook && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowReviewForm(true)}
            >
              レビューを書く
            </Button>
          )}
        </div>

        {reviews.length === 0 ? (
          <p className="text-[13px] text-stone-400">
            まだレビューがありません
          </p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="border border-stone-200 rounded p-3 space-y-1.5 bg-white"
              >
                <h3 className="font-medium text-sm text-stone-700">{review.title}</h3>
                <p className="text-[13px] text-stone-500 whitespace-pre-wrap">
                  {review.body}
                </p>
                <p className="text-xs text-stone-400">
                  {new Date(review.created_at).toLocaleDateString("ja-JP")}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Edit Dialog */}
      <Dialog open={editingStatus} onOpenChange={setEditingStatus}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>書籍情報を編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">ステータス</label>
              <Select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as BookStatus)}
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">評価</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`text-2xl ${
                      rating && star <= rating
                        ? "text-yellow-500"
                        : "text-stone-300"
                    }`}
                    onClick={() =>
                      setRating(rating === star ? null : star)
                    }
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">プライベートメモ</label>
              <Textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                maxLength={5000}
                rows={5}
                placeholder="Markdown対応のプライベートメモ"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setEditingStatus(false)}
              >
                キャンセル
              </Button>
              <Button onClick={handleUpdateUserBook} disabled={saving}>
                {saving ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Form Dialog */}
      <Dialog open={showReviewForm} onOpenChange={setShowReviewForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>レビューを書く</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">タイトル</label>
              <Input
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                maxLength={100}
                placeholder="レビュータイトル"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">本文</label>
              <Textarea
                value={reviewBody}
                onChange={(e) => setReviewBody(e.target.value)}
                maxLength={10000}
                rows={8}
                placeholder="読書感想を書いてください..."
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={reviewIsPublic}
                onChange={(e) => setReviewIsPublic(e.target.checked)}
                className="rounded"
              />
              公開する
            </label>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowReviewForm(false)}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleSubmitReview}
                disabled={savingReview || !reviewTitle || !reviewBody}
              >
                {savingReview ? "投稿中..." : "投稿する"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tag Manager Dialog */}
      <Dialog open={showTagManager} onOpenChange={setShowTagManager}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>タグ管理</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Create new tag */}
            <div className="space-y-2">
              <label className="text-sm font-medium">新しいタグを作成</label>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateTag();
                }}
                className="flex gap-2"
              >
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="タグ名（最大30文字）"
                  maxLength={30}
                  className="flex-1"
                />
                <Button type="submit" disabled={!newTagName.trim()}>
                  作成
                </Button>
              </form>
            </div>

            {/* Available tags */}
            <div className="space-y-2">
              <label className="text-sm font-medium">タグ一覧</label>
              {allTags.length === 0 ? (
                <p className="text-xs text-stone-400">
                  タグがまだありません。上から作成してください。
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {allTags.map((tag) => {
                    const isAttached = userBook?.tags.some(
                      (t) => t.id === tag.id
                    );
                    return (
                      <div
                        key={tag.id}
                        className="flex items-center justify-between p-2 border border-stone-200 rounded text-sm"
                      >
                        <span>{tag.name}</span>
                        <div className="flex gap-1">
                          {isAttached ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => handleRemoveTag(tag.id)}
                            >
                              外す
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => handleAddTag(tag.id)}
                            >
                              付ける
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 text-red-600"
                            onClick={() => handleDeleteTag(tag.id)}
                          >
                            削除
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowTagManager(false)}
              >
                閉じる
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
