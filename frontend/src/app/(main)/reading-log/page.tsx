"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReadingHeatmap } from "@/components/reading-log/heatmap";
import { apiClient, ApiRequestError } from "@/lib/api-client";
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
        apiClient.get<HeatmapData>(
          `/me/reading-logs/heatmap?year=${new Date().getFullYear()}`
        ),
        apiClient.get<PaginatedResponse<UserBook>>(
          `/me/books?status=reading&per_page=50`
        ),
      ]);
      setLogs(logsRes.data);
      setTotalPages(logsRes.meta.total_pages);
      setHeatmapData(heatmapRes);
      setReadingBooks(booksRes.data);
    } catch {
      // Error handling
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openNewForm = () => {
    setEditingLog(null);
    setFormBookId(readingBooks[0]?.book?.id || "");
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
      // Error handling
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">読書ログ</h1>
        <Button onClick={openNewForm}>ログを記録</Button>
      </div>

      {/* Heatmap */}
      <section className="bg-card border border-border rounded-lg p-4">
        <h2 className="text-sm font-medium mb-3">読書ヒートマップ</h2>
        <ReadingHeatmap data={heatmapData} />
      </section>

      {/* Logs list */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium">読書ログ一覧</h2>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-16 bg-muted animate-pulse rounded-lg"
              />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
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
                  className="flex items-center gap-4 p-3 border border-border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {log.read_date}
                    </p>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                      {log.pages_read && <span>{log.pages_read}ページ</span>}
                      {log.minutes_read && <span>{log.minutes_read}分</span>}
                    </div>
                    {log.note && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
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
                      className="text-destructive"
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
                <span className="flex items-center text-sm text-muted-foreground">
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
              <Select
                value={formBookId}
                onChange={(e) => setFormBookId(e.target.value)}
                required
              >
                <option value="">選択してください</option>
                {readingBooks.map((ub) => (
                  <option key={ub.book.id} value={ub.book.id}>
                    {ub.book.title}
                  </option>
                ))}
              </Select>
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
              <p className="text-sm text-destructive">{formError}</p>
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
