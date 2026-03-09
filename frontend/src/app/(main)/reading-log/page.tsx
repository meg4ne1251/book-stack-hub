"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReadingHeatmap } from "@/components/reading-log/heatmap";
import { apiClient, ApiRequestError } from "@/lib/api-client";
import { toast } from "sonner";
import type {
  ReadingLog,
  HeatmapData,
  UserBook,
  PaginatedResponse,
} from "@/types/api";

export default function ReadingLogPage() {
  const [logs, setLogs] = useState<ReadingLog[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapData>({});
  const [readingBooks, setReadingBooks] = useState<UserBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingLog, setEditingLog] = useState<ReadingLog | null>(null);
  const [formBookId, setFormBookId] = useState("");
  const [formBookFilter, setFormBookFilter] = useState("");
  const [formDate, setFormDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [formPages, setFormPages] = useState("");
  const [formMinutes, setFormMinutes] = useState("");
  const [formNote, setFormNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, heatmapRes, booksRes] = await Promise.all([
        apiClient.get<PaginatedResponse<ReadingLog>>(
          `/me/reading-logs?page=${page}&per_page=20`
        ),
        apiClient.get<{ data: HeatmapData }>(
          `/me/reading-logs/heatmap?year=${new Date().getFullYear()}`
        ),
        apiClient.get<PaginatedResponse<UserBook>>(
          `/me/books?per_page=50`
        ),
      ]);
      setLogs(logsRes.data);
      setTotalPages(logsRes.meta.total_pages);
      setHeatmapData(heatmapRes.data);
      setReadingBooks(booksRes.data);
    } catch {
      toast.error("読書ログの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredBooks = useMemo(() => {
    if (!formBookFilter.trim()) return readingBooks;
    const q = formBookFilter.toLowerCase();
    return readingBooks.filter(
      (ub) =>
        ub.book.title.toLowerCase().includes(q) ||
        ub.book.authors?.some((a) => a.toLowerCase().includes(q))
    );
  }, [readingBooks, formBookFilter]);

  const openNewForm = () => {
    setEditingLog(null);
    setFormBookId(readingBooks[0]?.book?.id || "");
    setFormBookFilter("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormPages("");
    setFormMinutes("");
    setFormNote("");
    setFormError(null);
    setShowForm(true);
  };

  const openEditForm = (log: ReadingLog) => {
    setEditingLog(log);
    setFormBookId(log.book_id);
    setFormDate(log.read_date);
    setFormPages(log.pages_read?.toString() || "");
    setFormMinutes(log.minutes_read?.toString() || "");
    setFormNote(log.note || "");
    setFormError(null);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formBookId || !formDate) return;
    setSaving(true);
    setFormError(null);

    const payload = {
      book_id: formBookId,
      read_date: formDate,
      pages_read: formPages ? parseInt(formPages) : null,
      minutes_read: formMinutes ? parseInt(formMinutes) : null,
      note: formNote || null,
    };

    try {
      if (editingLog) {
        await apiClient.patch(`/me/reading-logs/${editingLog.id}`, payload);
      } else {
        await apiClient.post("/me/reading-logs", payload);
      }
      setShowForm(false);
      fetchData();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setFormError(err.message);
      } else {
        setFormError("保存に失敗しました");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (logId: string) => {
    if (!confirm("この読書ログを削除しますか？")) return;
    try {
      await apiClient.delete(`/me/reading-logs/${logId}`);
      fetchData();
    } catch {
      toast.error("読書ログの削除に失敗しました");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-xl font-bold text-stone-800">読書ログ</h1>
        <Button onClick={openNewForm} size="sm">ログを記録</Button>
      </div>

      {/* Heatmap */}
      <section className="bg-white border border-stone-200 rounded p-4">
        <h2 className="text-[13px] font-medium text-stone-500 mb-3">読書ヒートマップ</h2>
        <ReadingHeatmap data={heatmapData} />
      </section>

      {/* Logs list */}
      <section className="space-y-3">
        <h2 className="text-[13px] font-medium text-stone-500">読書ログ一覧</h2>

        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-14 bg-stone-100 animate-pulse rounded"
              />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-stone-400 text-sm">
              まだ読書ログがありません
            </p>
            <Button className="mt-4" onClick={openNewForm}>
              最初のログを記録する
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 p-3 border border-stone-200 rounded bg-white">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-stone-700">
                      {log.read_date}
                      {(() => {
                        const ub = readingBooks.find((b) => b.book.id === log.book_id);
                        return ub ? (
                          <span className="ml-2 text-xs text-stone-400 font-normal">
                            {ub.book.title}
                          </span>
                        ) : null;
                      })()}
                    </p>
                    <div className="flex gap-3 text-xs text-stone-400 mt-0.5">
                      {log.pages_read && <span>{log.pages_read}ページ</span>}
                      {log.minutes_read && <span>{log.minutes_read}分</span>}
                    </div>
                    {log.note && (
                      <p className="text-xs text-stone-400 mt-0.5 truncate">
                        {log.note}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditForm(log)}
                    >
                      編集
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      onClick={() => handleDelete(log.id)}
                    >
                      削除
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  前へ
                </Button>
                <span className="flex items-center text-[13px] text-stone-400">
                  {page} / {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  次へ
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Log Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLog ? "読書ログを編集" : "読書ログを記録"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">対象書籍 *</label>
              <Input
                value={formBookFilter}
                onChange={(e) => setFormBookFilter(e.target.value)}
                placeholder="書籍名で絞り込み..."
                className="mb-2"
              />
              <div className="max-h-40 overflow-y-auto border border-stone-200 rounded">
                {filteredBooks.length === 0 ? (
                  <p className="text-xs text-stone-400 p-3 text-center">
                    該当する書籍がありません
                  </p>
                ) : (
                  filteredBooks.map((ub) => (
                    <div
                      key={ub.book.id}
                      className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-sm hover:bg-stone-50 ${
                        formBookId === ub.book.id
                          ? "bg-amber-50 border-l-2 border-amber-600"
                          : ""
                      }`}
                      onClick={() => setFormBookId(ub.book.id)}
                    >
                      <div className="w-6 h-9 flex-shrink-0 bg-stone-100 rounded overflow-hidden">
                        {ub.book.cover_image_url ? (
                          <img
                            src={ub.book.cover_image_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-stone-100" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{ub.book.title}</p>
                        <p className="text-xs text-stone-400 truncate">
                          {ub.book.authors?.join(", ")}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">読書日 *</label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">読んだページ数</label>
                <Input
                  type="number"
                  min={1}
                  max={99999}
                  value={formPages}
                  onChange={(e) => setFormPages(e.target.value)}
                  placeholder="例: 50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">読書時間（分）</label>
                <Input
                  type="number"
                  min={1}
                  max={1440}
                  value={formMinutes}
                  onChange={(e) => setFormMinutes(e.target.value)}
                  placeholder="例: 30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">メモ</label>
              <Textarea
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="読書メモ..."
              />
            </div>

            {formError && (
              <p className="text-sm text-red-600">{formError}</p>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                キャンセル
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saving || !formBookId || !formDate}
              >
                {saving ? "保存中..." : editingLog ? "更新" : "記録する"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
