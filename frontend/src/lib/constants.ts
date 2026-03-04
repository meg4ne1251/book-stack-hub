import type { BookStatus } from "@/types/api";

export const STATUS_LABELS: Record<BookStatus, string> = {
  want_to_read: "買いたい/読みたい",
  unread: "所有/未読",
  reading: "読書中",
  suspended: "中断",
  finished: "読了",
};
