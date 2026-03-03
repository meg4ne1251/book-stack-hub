"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiClient, ApiRequestError } from "@/lib/api-client";

interface CustomBookFormProps {
  onSuccess: () => void;
}

export function CustomBookForm({ onSuccess }: CustomBookFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState("");
  const [publisher, setPublisher] = useState("");
  const [publishedDate, setPublishedDate] = useState("");
  const [isbn, setIsbn] = useState("");
  const [description, setDescription] = useState("");
  const [pageCount, setPageCount] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("title", title);
      if (authors) formData.append("authors", authors);
      if (publisher) formData.append("publisher", publisher);
      if (publishedDate) formData.append("published_date", publishedDate);
      if (isbn) formData.append("isbn", isbn);
      if (description) formData.append("description", description);
      if (pageCount) formData.append("page_count", pageCount);
      if (coverImage) formData.append("cover_image", coverImage);

      await apiClient.post("/books/custom", formData);
      onSuccess();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.code === "ALREADY_EXISTS") {
          setError("同じISBNの書籍が既に登録されています。検索から追加してください。");
        } else {
          setError(err.message);
        }
      } else {
        setError("登録に失敗しました");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-[13px] rounded border border-red-200">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">タイトル *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          required
          placeholder="書籍タイトル"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="authors">著者（カンマ区切りで複数入力可）</Label>
        <Input
          id="authors"
          value={authors}
          onChange={(e) => setAuthors(e.target.value)}
          placeholder="著者名1, 著者名2"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="publisher">出版社</Label>
          <Input
            id="publisher"
            value={publisher}
            onChange={(e) => setPublisher(e.target.value)}
            maxLength={100}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="publishedDate">出版日</Label>
          <Input
            id="publishedDate"
            type="date"
            value={publishedDate}
            onChange={(e) => setPublishedDate(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="isbn">ISBN</Label>
          <Input
            id="isbn"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            placeholder="ISBN-10 or ISBN-13"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pageCount">ページ数</Label>
          <Input
            id="pageCount"
            type="number"
            min={1}
            max={99999}
            value={pageCount}
            onChange={(e) => setPageCount(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">説明</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="coverImage">表紙画像（JPEG/PNG/WebP, 最大5MB）</Label>
        <Input
          id="coverImage"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
        />
      </div>

      <Button type="submit" disabled={loading || !title}>
        {loading ? "登録中..." : "カスタム書籍を登録"}
      </Button>
    </form>
  );
}
