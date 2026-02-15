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
import type {
  Book,
  UserBook,
  BookStatus,
  Review,
  PaginatedResponse,
} from "@/types/api";

const STATUS_LABELS: Record<BookStatus, string> = {
  want_to_read: "読みたい",
  unread: "未読",
  tsundoku: "積読",
  reading: "読書中",
  suspended: "中断",
  finished: "読了",
};

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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [bookRes, reviewsRes] = await Promise.all([
          apiClient.get<Book>(`/books/${bookId}`),
          apiClient
            .get<PaginatedResponse<Review>>(`/books/${bookId}/reviews`)
            .catch(() => ({ data: [], meta: { page: 1, per_page: 20, total: 0, total_pages: 0 } })),
        ]);
        setBook(bookRes);
        setReviews(reviewsRes.data);

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
      const res = await apiClient.post<UserBook>("/me/books", {
        book_id: bookId,
        status,
      });
      setUserBook(res);
      setNewStatus(res.status);
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
      const res = await apiClient.patch<UserBook>(
        `/me/books/${userBook.id}`,
        {
          status: newStatus,
          rating,
          private_memo: memo || null,
        }
      );
      setUserBook(res);
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto animate-pulse space-y-6">
        <div className="flex gap-6">
          <div className="w-48 h-72 bg-muted rounded-lg" />
          <div className="flex-1 space-y-3">
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-5 bg-muted rounded w-1/2" />
            <div className="h-5 bg-muted rounded w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !book) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-destructive">{error}</p>
        <Button className="mt-4" variant="outline" onClick={() => router.back()}>
          戻る
        </Button>
      </div>
    );
  }

  if (!book) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Book Info */}
      <div className="flex flex-col sm:flex-row gap-6">
        <div className="w-48 flex-shrink-0">
          <div className="aspect-[2/3] bg-muted rounded-lg overflow-hidden shadow-md">
            {book.cover_image_url ? (
              <img
                src={book.cover_image_url}
                alt={book.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground p-4 text-center">
                {book.title}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <h1 className="text-2xl font-bold">{book.title}</h1>
            {book.subtitle && (
              <p className="text-lg text-muted-foreground">{book.subtitle}</p>
            )}
          </div>

          <p className="text-muted-foreground">
            {book.authors?.join(", ") || "著者不明"}
          </p>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
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
                読みたいに追加
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
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
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
                    className="text-destructive"
                    onClick={handleRemoveFromShelf}
                  >
                    削除
                  </Button>
                </div>
              </div>
              {userBook.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {userBook.tags.map((tag) => (
                    <Badge key={tag.id} variant="outline" className="text-xs">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {book.description && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">あらすじ・概要</h2>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {book.description}
          </p>
        </section>
      )}

      {/* Data credit */}
      <p className="text-xs text-muted-foreground">
        データ提供元: {book.source === "google" ? "Google Books" : book.source === "rakuten" ? "楽天ブックス" : book.source}
      </p>

      {/* Reviews */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">レビュー</h2>
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
          <p className="text-sm text-muted-foreground">
            まだレビューがありません
          </p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="border border-border rounded-lg p-4 space-y-2"
              >
                <h3 className="font-medium">{review.title}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {review.body}
                </p>
                <p className="text-xs text-muted-foreground">
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
                        : "text-muted-foreground"
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

            {error && <p className="text-sm text-destructive">{error}</p>}

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
    </div>
  );
}
